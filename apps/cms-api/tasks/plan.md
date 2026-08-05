# Plan: Document I/O Performance + Bulk-Delete Rollback

See `docs/specs/document-io-performance-and-rollback.md` for the full spec (objective, decisions, scope).
This plan implements it, with one correction to the spec's diagnosis (below) discovered during planning.

## Context

Live CV updates (`PUT .../cv-page/:documentId`) take 1-3s vs. near-instant locally. The spec traced this
to `ComponentIoService`, shared by every document service. Re-reading the code carefully during planning
turned up a more precise diagnosis than the spec states:

- **`hydrateComponents`/`hydrateRows`** (reads) and **`deleteComponentField`** (deletes) are **already
  schema-bounded** — `hydrateRows` pre-fetches all rows for a nested field name *once* before recursing
  into each parent row (`component-io.service.ts:96-101`), and `deleteByDocument` deletes by
  `document_id` alone, no parent scoping at all. Both issue exactly one query per distinct component path
  in the schema (7 for `cv-page`), independent of how many experiences/roles/etc. exist. **No changes
  needed here** — the spec's claim that hydrate "mirrors the exact same fan-out" as the write path is
  wrong; this plan corrects that line when updating the spec post-build.
- **`saveComponentField`** (writes) is the one real bottleneck: it recurses **per item** (line 53-65),
  calling `ComponentIoService.saveComponentField` — and therefore `PrismaComponentRepository.upsertAll` —
  once per parent row instead of once per component path. For `cv-page` with 3 experiences, that's 3
  separate DELETE+INSERT pairs for `roles` instead of 1. This is exactly the work the *prior* perf fix
  (`bulk-create-publish`) explicitly deferred: its own `tasks/plan.md` (now superseded by this file) listed
  "Batching nested `syllableParts` writes across sibling `phonetics` rows within one item's
  `saveComponentField` recursion" as out of scope for that pass. This plan is that deferred work,
  generalized to every content type via the shared service.

Separately, the user's rollback requirement is already satisfied everywhere except `bulk-delete.service.ts`
(confirmed by reading every mutating service — see spec's Diagnosis table). Fixing that is independent of
the performance work and touches different files.

## Design

### 1. `PrismaComponentRepository.upsertAll` — batch across all parents at one schema depth

Current signature takes one `parentComponentId: string | null` applied to every row and to the DELETE's
scope. Change to take the *set* of parent IDs being replaced at this level, with each `ComponentEntity`
carrying its own `parentComponentId` (already a field on the entity — `component.entity.ts:8`) for the
INSERT:

```ts
upsertAll(
  slug: string,
  componentPath: string[],
  documentId: string,
  version: DocumentVersion,
  parentComponentIds: (string | null)[],   // was: parentComponentId: string | null
  components: ComponentEntity[],           // each entity's own .parentComponentId is now used per-row
  fields: FieldDefinition[],
  tx?: Prisma.TransactionClient,
): Promise<void>
```

- DELETE clause: `parentComponentIds` is always either `[null]` (top-level call) or a list of UUIDs
  (nested call, one per parent processed at this level) — never mixed. Branch on that: `IS NULL` vs.
  `= ANY($n::uuid[])`.
- INSERT: use `component.parentComponentId` per row instead of the removed single param.
- `IComponentRepository` interface updated to match (single caller: `ComponentIoService` — low risk, but
  flagged per the spec's "ask first: interface changes" boundary; proceeding since there's no viable
  alternative that keeps the round-trip count schema-bounded).

### 2. `ComponentIoService.saveComponentField`/`saveComponents` — breadth-first traversal

Restructure from depth-first-per-item to breadth-first-per-level, mirroring the pattern `hydrateRows`
already uses for reads. Each call now handles *all* parents at one (documentId, componentPath) level in
one shot:

```ts
async saveComponents(slug, documentId, version, fields, data, tx) {
  for (const field of fields.filter(isComponentField)) {
    await this.saveComponentTree(slug, [componentName(field)], documentId, version, field,
      [{ parentComponentId: null, rawValue: data[field.name] }], tx);
  }
}

private async saveComponentTree(slug, componentPath, documentId, version, field, parentEntries, tx) {
  const subFields = field.fields ?? [];
  const parentIds: (string | null)[] = [];
  const allEntities: ComponentEntity[] = [];
  const itemsWithEntity: { entity: ComponentEntity; item: Record<string, unknown> }[] = [];

  for (const { parentComponentId, rawValue } of parentEntries) {
    parentIds.push(parentComponentId);
    for (const item of normalizeIncomingItems(field, rawValue)) {
      const entity = new ComponentEntity(randomUUID(), documentId, version, parentComponentId, scalarFieldsOf(subFields, item), {});
      allEntities.push(entity);
      itemsWithEntity.push({ entity, item });
    }
  }

  await this.components.upsertAll(slug, componentPath, documentId, version, parentIds, allEntities, subFields, tx);

  for (const nestedField of subFields.filter(isComponentField)) {
    const nestedParentEntries = itemsWithEntity.map(({ entity, item }) => ({
      parentComponentId: entity.componentId,
      rawValue: item[nestedField.name],
    }));
    await this.saveComponentTree(slug, [...componentPath, componentName(nestedField)], documentId, version, nestedField, nestedParentEntries, tx);
  }
}
```

Correctness-critical ordering preserved: `upsertAll` for a level is still `await`ed in full before
descending into that level's nested fields (parent rows must exist before child rows reference them via
`parent_component_id`). Result: exactly one `upsertAll` call per distinct component path in the schema
(7 for `cv-page`) regardless of item count — same shape the read/delete paths already have.

Top-level sibling fields (`skills`, `experiences`, `projects`, ...) stay independent calls; not merged
into `Promise.all` — queries on one Prisma transaction's single reserved connection serialize at the wire
level regardless of JS-side concurrency (`pg`'s `Client` processes its query queue one at a time), so
`Promise.all` there would add complexity without reducing round trips. The real, guaranteed win is the
round-trip *count* reduction above, not concurrency.

### 3. `bulk-delete.service.ts` — all-or-nothing via one spanning transaction

Delete has no created rows to compensate away (unlike bulk-create+publish), and no bounded-concurrency
requirement, so a single spanning transaction is the correct mechanism here (a deliberate, documented
divergence from bulk-create-publish's "no spanning transaction" decision — see spec Decision 3).

```ts
// delete-document.service.ts — add optional tx, mirroring the pattern already used by
// SaveDocumentService/PublishDocumentService for their contentType/draftOverride params
async execute(slug: string, documentId: string, tx?: Prisma.TransactionClient): Promise<void> {
  const contentType = await this.schemaResolver.resolve(slug);
  assertKind(contentType, "collection");
  const [draft, published] = await Promise.all([...]);   // unchanged — reads stay pool-scoped, matching today's existing pattern (IDocumentRepository read methods take no tx param)
  if (!draft && !published) throw new NotFoundException(...);

  const run = async (t: Prisma.TransactionClient) => {
    await this.componentIo.deleteComponents(slug, documentId, "draft", contentType.fields, t);
    await this.componentIo.deleteComponents(slug, documentId, "published", contentType.fields, t);
    await this.documents.deleteAllVersions(slug, documentId, t);
  };
  if (tx) await run(tx);
  else await this.prisma.$transaction(run);
}
```

```ts
// bulk-delete.service.ts — inject PrismaService, wrap the loop in one transaction
async execute(slug: string, documentIds: string[]): Promise<string[]> {
  if (documentIds.length === 0) return [];
  await this.prisma.$transaction(async (tx) => {
    for (const documentId of documentIds) {
      await this.deleteDocument.execute(slug, documentId, tx);
    }
  });
  return documentIds;
}
```

Sequential `await` inside the loop is intentional and correct (same single-connection reasoning as
above) — no need for chunking since delete has no per-item external work to parallelize.

`BulkDeleteResult`/error-collection type removed — a failure now throws (propagates the original error,
e.g. `NotFoundException`), and the transaction auto-rolls-back every delete performed so far in the batch.

### 4. Response contract change (confirmed with user)

- `BulkDeleteService.execute` returns `string[]` (deleted IDs) instead of `BulkDeleteResult[]`.
- `collection-type-document.controller.ts`'s `bulkDelete` handler returns `{ deleted: string[] }` — drop
  `failed` entirely.
- `BulkDeleteResponseDto` (`document-response.dto.ts:94-100`): drop the `failed`/`BulkDeleteFailureDto`
  fields; remove `BulkDeleteFailureDto` if it becomes unused.
- `@ApiOperation` summary on the bulk-delete route updated (currently says "no rollback on partial
  failure" — now false).

### 5. Docs

- `docs/documents/document.md`: update the "Bulk delete" line (`document.md:146`) and the endpoint table
  row (`document.md:175`) to describe all-or-nothing + the new response shape; update "Services —
  collection-type" intro if it needs to mention the batching change.
- `docs/specs/document-io-performance-and-rollback.md`: correct the Diagnosis section's overstated
  read-side claim (per Context above) once implementation confirms the design; this is a spec-accuracy
  fix, not a scope change.

## Explicitly out of scope (unchanged from spec)

- `hydrateComponents`/`hydrateRows`/`deleteComponentField` — already schema-bounded, no changes.
- `bulk-create-publish.service.ts` — untouched beyond automatically inheriting `ComponentIoService`'s
  speedup.
- Any change to `SaveDocumentService.execute`/`PublishDocumentService.execute`/`ComponentIoService`'s
  public method *signatures* other than the `upsertAll`/`saveComponentField` internals described above —
  callers (`save-document.service.ts`, `publish-document.service.ts`, `duplicate-document.service.ts`,
  `save-single-type.service.ts`, `publish-single-type.service.ts`) call `saveComponents`, whose external
  signature is unchanged.
- Post-write response-hydration steps (e.g. `GetDocumentForEditService` called after a `PUT` commits) —
  confirmed out of scope for rollback.

## Risks

| Risk | Impact | Mitigation |
|---|---|---|
| `upsertAll`'s new multi-parent signature has a bug in the `IS NULL` vs. `ANY(...)` branch | High if wrong (data loss/leak across documents) | Unit tests assert the exact DELETE SQL/params for both branches; e2e 3-level round-trip test (`content-engine.e2e-spec.ts:303`) already exercises `experiences → roles` end-to-end |
| Breadth-first rewrite changes ordering assumptions somewhere else that depended on depth-first per-item processing | Med | Existing `component-io.service.spec.ts` 3-level nesting test must still pass unmodified in assertions about `parentComponentId` linkage; extend rather than replace |
| `bulk-delete`'s spanning transaction holds one connection for the whole batch (up to 100 IDs per `BulkDeleteDto`'s `ArrayMaxSize(100)`) | Low | 100 sequential deletes on one connection is small; no chunking needed, flag as fine unless benchmark says otherwise |
| `BulkDeleteResponseDto`/`@ApiOperation` contract change breaks an existing consumer | Low (only CMS-Admin, not yet integrated per project memory) | Explicit response-shape change called out in commit + docs update |

## Testing Strategy

- **Unit** (`component-io.service.spec.ts`): extend the existing 3-level nesting test to assert
  `upsertAll` is called exactly **once** per component path (currently would be 3x for `roles` under 3
  experiences) with the full multi-parent entity list and correct `parentComponentIds` array; add a
  case with an empty-items parent (an experience with zero roles still contributes its ID to the DELETE
  scope). Extend `prisma-component.repository.spec.ts` (if it exists) or add coverage for the new
  `IS NULL`/`ANY(...)` DELETE branches directly.
- **Unit** (`bulk-delete.service.spec.ts`): full rewrite for all-or-nothing — all-success returns all IDs;
  a failing ID rolls back every delete in the batch (assert via the transaction mock or a fake
  `DeleteDocumentService` whose later call throws); empty array short-circuits without opening a
  transaction.
- **Unit** (`delete-document.service.spec.ts`): extend for the new optional `tx` param — passing a
  transaction client skips opening a new `$transaction` and uses the passed client directly.
- **E2E** (`content-engine.e2e-spec.ts`): add a `cv-page` update wall-clock benchmark (same `Date.now()`
  pattern as the existing 50-item bulk-create benchmark at line 556-564), logged, no hard threshold; add
  a bulk-delete case that mixes one unknown ID into a real batch and asserts **zero** documents were
  deleted (querying them back via `GET`) rather than a partial set — replacing/extending the existing
  bulk-delete assertions around line 514-519.
- **Coverage:** extend `coverageThreshold` entries for `component-io.service.ts` and
  `bulk-delete.service.ts`/`delete-document.service.ts` if branch coverage grows materially (per
  `docs/rules/workflow.md`, skip Prisma repository files and controllers).

## Verification (per phase and overall)

1. `bun run build && bun run lint && bun run test:cov` — all green.
2. `bun run test:e2e` against real local Postgres — all suites green, including the new `cv-page` timing
   benchmark and the bulk-delete all-or-nothing case.
3. Manual sanity: `PUT` a `cv-page` document with several experiences/roles via the running dev server,
   confirm response time is materially lower than before; `DELETE .../bulk` with one bad ID mixed in,
   confirm nothing was deleted.
