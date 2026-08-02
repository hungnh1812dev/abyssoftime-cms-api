# Plan: Bulk Create+Publish Performance Fix

See `docs/specs/bulk-create-publish-performance.md` for the full spec (objective, diagnosis, decisions,
scope, success criteria). This plan implements it.

## Context

`POST /api/v1/documents/collection-type/:slug/bulk` takes ~5 minutes for 50 `en-it-vocab` items.
`BulkCreateAndPublishService.execute()` (`bulk-create-publish.service.ts:21-35`) runs a `for` loop with
`await` inside — fully sequential, ~28-36 unbatched raw SQL round trips per item, none concurrent. Locked
decisions: (1) keep per-item transactions + compensating-delete rollback, no spanning transaction; (2)
allow bounded concurrency in fixed-size chunks, with all-or-nothing rollback across the whole batch; (3)
no fixed perf SLA, just a demonstrated before/after improvement; (4) redundant-work removal via
backward-compatible optional parameters on `SaveDocumentService.execute`/`PublishDocumentService.execute`
(single source of truth), not a duplicated bulk-only reimplementation.

## Confirmed callers (verified by reading source, not assumed)

`SaveDocumentService.execute`/`PublishDocumentService.execute` are called from exactly two places besides
the bulk service, both using today's 3-4 positional args (new params are trailing/optional, unaffected):
`collection-type-document.controller.ts` (create/update/publish routes),
`graphql/.../resolver-factory.service.ts` (~lines 216/223/238). `DuplicateDocumentService` and
`DeleteDocumentService` do not call these services — not touched.

## Design

### 1. `SaveDocumentService.execute` — add optional `contentType`, skip guaranteed-empty lookup, fix a latent field-normalization bug

```ts
async execute(
  slug: string,
  data: Record<string, unknown>,
  documentId: string | undefined,
  userId: string | null,
  contentType?: ContentTypeEntity,
): Promise<DocumentEntity>
```

- If `contentType` passed, skip `schemaResolver.resolve(slug)`.
- Only call `documents.findByVersion(...)` when `documentId` is truthy — when `undefined` (every
  bulk-create item, and every non-bulk `POST /:slug` create), the lookup is guaranteed empty, so skip it.
- **Bug fix**: `doc.fields` today is raw client `data` verbatim — an omitted optional scalar field is a
  missing key, not `null`, unlike a DB round-trip (`extractRowFields`, `row-mapper.ts:11-21`) which always
  normalizes every declared non-component field via `?? null`. Add the same normalization:
  ```ts
  function withScalarDefaults(data: Record<string, unknown>, fields: FieldDefinition[]): Record<string, unknown> {
    const result = { ...data };
    for (const field of fields) {
      if (!isComponentField(field)) result[field.name] = data[field.name] ?? null;
    }
    return result;
  }
  ```
  Additive-only (adds `null` keys, never removes/renames) but changes response shape for every create.
  Required so `SaveDocumentService`'s returned entity is safe to reuse as Publish's `draftOverride` below.

### 2. `PublishDocumentService.execute` — add optional `contentType`, `draftOverride`, `isNewDocument`

```ts
async execute(
  slug: string,
  documentId: string,
  userId: string | null,
  contentType?: ContentTypeEntity,
  draftOverride?: DocumentEntity,
  isNewDocument = false,
): Promise<DocumentEntity>
```

- `contentType` passed → skip resolve.
- `draftOverride` passed → use it instead of `documents.findByVersion(..., "draft", ...)`.
- `isNewDocument: true` → skip `documents.findByVersion(..., "published", ...)`
  (`existingPublished?.createdAt ?? now` already equals `now` when guaranteed null).

### 3. `BulkCreateAndPublishService.execute` — hoist schema resolve, chunked concurrency, discriminated per-item outcomes

Inject `SchemaResolverService` (already exists elsewhere). Resolve `contentType` once. Process
`itemsData` in fixed-size chunks (`CHUNK_SIZE = 5` — `pg.Pool` default max is 10 per
`src/prisma/application/client/runtime/client.js:77`, no explicit `max` set; 5 leaves headroom). Each
item's worker never rejects — returns a discriminated outcome so a partial failure within one item (save
succeeds, publish throws) still reports the created doc for rollback:

```ts
type ItemOutcome = { ok: true; result: DocumentEntity } | { ok: false; error: unknown; createdDoc?: DocumentEntity };

private async processItem(slug: string, contentType: ContentTypeEntity, data: Record<string, unknown>, userId: string | null): Promise<ItemOutcome> {
  let savedDoc: DocumentEntity | undefined;
  try {
    savedDoc = await this.saveDocument.execute(slug, data, undefined, userId, contentType);
    if (savedDoc.version !== "draft") return { ok: true, result: savedDoc };
    const published = await this.publishDocument.execute(slug, savedDoc.documentId, userId, contentType, savedDoc, true);
    return { ok: true, result: published };
  } catch (error) {
    return { ok: false, error, createdDoc: savedDoc };
  }
}
```

Chunks processed strictly in order (await chunk N fully before starting chunk N+1). Original item order
preserved in `results`:

```ts
for (const chunk of chunksOf(itemsData, CHUNK_SIZE)) {
  const outcomes = await Promise.all(chunk.map((data) => this.processItem(slug, contentType, data, userId)));
  let failure: unknown;
  for (const outcome of outcomes) {
    if (outcome.ok) {
      created.push(outcome.result);
      results.push(outcome.result);
    } else {
      if (outcome.createdDoc) created.push(outcome.createdDoc);
      failure ??= outcome.error;
    }
  }
  if (failure !== undefined) {
    await this.rollback(slug, created);
    throw failure;
  }
}
```

`rollback` unchanged (sequential compensating deletes via `DeleteDocumentService` — unhappy path, not
optimized).

## Explicitly deferred (documented, not part of this pass)

- Batching nested `syllableParts` writes across sibling `phonetics` rows within one item's
  `saveComponentField` recursion.
- Merging the save and publish transactions into one combined transaction per item.
- Bulk delete, single-type routes, the intentionally-preserved "missing/empty `data` not rejected" gap —
  untouched.

## Risks

| Risk | Impact | Mitigation |
|---|---|---|
| `withScalarDefaults` changes response shape for all creates (adds `null` keys) | Low — additive only | Called out explicitly; easy to spot in review/diff |
| Chunk size 5 too conservative/aggressive | Low-Med | Named constant, easy to tune later |
| Full rewrite of `bulk-create-publish.service.spec.ts` loses coverage of an existing edge case | Med | Explicit acceptance list in Task 4 enumerates every old case plus new ones |
| GraphQL resolver call sites regress silently | Low | Verified both call sites use positional args that stay valid; full suite covers them |

## Verification (per phase and overall)

1. `bun run build && bun run lint && bun run test:cov` — all green.
2. `bun run test:e2e` against real local Postgres — all three e2e suites green, including the new 50-item
   benchmark case with a logged duration.
3. Manual sanity: hit `POST /api/v1/documents/collection-type/en-it-vocab/bulk` with 50 items via the
   running dev server and confirm wall-clock time is materially lower than the reported ~5 minutes.
