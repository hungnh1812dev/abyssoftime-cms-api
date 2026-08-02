# Spec: Bulk Create+Publish Performance Fix

## Objective

`POST /api/v1/documents/collection-type/:slug/bulk` (`BulkCreateAndPublishService`) takes ~5 minutes for a
50-item batch against `en-it-vocab` (a content type with 4 repeatable component fields plus a nested
`syllableParts` component). Investigation (see diagnosis below) found ~1,600-1,800 sequential, unbatched
raw SQL round trips for 50 items, none running concurrently. This is a pure performance fix: make bulk
create+publish materially faster without changing the endpoint's request/response contract or its
documented all-or-nothing rollback behavior.

**User:** any CMS-Admin/API consumer bulk-importing collection-type content (the reported case is content
editors seeding vocabulary entries).

**Success looks like:** a 50-item `en-it-vocab` bulk create+publish completes in materially less time than
today's ~5 minutes, with identical response shape and identical rollback-on-failure guarantees, verified
by a real before/after timing in the e2e suite (no fixed SLA number — see Open Questions).

### Diagnosis (from investigation)

`BulkCreateAndPublishService.execute()` (`bulk-create-publish.service.ts:21-35`) runs a `for` loop with
`await` inside, calling `SaveDocumentService.execute()` then (when the content type is Mode A / draft-first)
`PublishDocumentService.execute()`, fully sequentially, one item at a time. Per item this does:

1. `schemaResolver.resolve(slug)` → `prisma.contentType.findUnique` — called **twice per item** (once in
   save, once in publish), even though the schema is identical and immutable across the whole batch.
2. `documents.findByVersion(...)` — called **3x per item** via raw SQL (once in save, twice in publish).
   In the bulk-create path `documentId` is always `undefined` (`bulk-create-publish.service.ts:23`), so
   `SaveDocumentService`'s own `findByVersion` call (`save-document.service.ts:27`) is guaranteed to find
   nothing — pure wasted work for this call site specifically.
3. Two separate `prisma.$transaction` calls (one in save, one in publish) — **100 transactions** for a
   50-item batch instead of one per item's actual unit of work.
4. `ComponentIoService.saveComponents`/`hydrateComponents` do a DELETE+INSERT (or SELECT) **per
   component field per item per version**, and for the nested `syllableParts` component, repeat that
   **once per parent row** (e.g. once per `phonetics` entry) instead of batching sibling rows.

Net: ~28-36 raw SQL round trips per item × 50 items, fully serialized (no `Promise.all`, no query
batching, no connection reuse benefit). No search/webhook/event code exists in this codebase — it's pure
unbatched-round-trip overhead compounding linearly.

## Decisions (confirmed with user)

1. **Rollback contract stays as-is.** No spanning DB transaction across the whole batch. Each item's
   save/publish keeps its own `prisma.$transaction`. On failure, all successfully-created items so far are
   still rolled back via compensating `DeleteDocumentService` calls (matches the documented contract in
   `docs/documents/document.md:145`, itself matching a reference source-doc design). Only *redundant,
   per-item work that doesn't need to repeat* is removed/batched.
2. **Bounded concurrency is allowed.** Items no longer need to process strictly one-at-a-time. Process in
   small concurrent chunks (exact chunk size is a Plan-phase implementation detail, not locked here — e.g.
   5-10 concurrent items) instead of a single sequential loop. On any item's failure anywhere in the batch:
   let the chunk currently in flight settle, then roll back **every** item successfully created so far
   (across all completed and in-flight chunks, not just prior chunks), then propagate the original error —
   same effective all-or-nothing guarantee as today, just not strictly request-ordered about which item's
   failure "wins" when multiple fail in the same chunk.
3. **No fixed performance SLA.** Success is judged by a real before/after benchmark (wall-clock time for a
   50-item `en-it-vocab` bulk create+publish against a real local Postgres), not a hard number. The fix
   should be materially faster — expect an order-of-magnitude-class improvement given the query-count
   reduction available, but no specific threshold gates "done."

## Scope

**In scope:**
- `BulkCreateAndPublishService` (`bulk-create-publish.service.ts`) and its direct collaborators as needed
  (`SaveDocumentService`, `PublishDocumentService`, `ComponentIoService`, `SchemaResolverService`,
  `IDocumentRepository`) — but only in ways that preserve their existing single-item call contracts used
  elsewhere (e.g. non-bulk `POST /:slug`, `PUT /:slug/:documentId`). Prefer additive/new methods over
  editing shared method signatures where those methods are reused outside the bulk path.
- Reducing redundant schema-resolution calls, redundant `findByVersion` lookups, and redundant per-item
  component I/O round trips within the bulk create+publish flow specifically.
- Updating `docs/documents/document.md`'s bulk-create+publish section to reflect the new concurrency
  behavior (rollback still all-or-nothing; ordering guarantee changes from strict-sequential to
  chunk-bounded).

**Out of scope:**
- `BulkDeleteService` / bulk delete route (already independent-per-ID with no rollback — not the reported
  problem).
- Single-type routes (`save-single-type.service.ts` etc. — no bulk concept there).
- The intentionally-preserved "missing/empty `data` not rejected" gap (`document.md:17`) — untouched.
- Any change to the public request/response DTO shapes (`BulkCreateDto`, response envelope) or to
  permission/guard behavior.
- Search indexing, webhooks, caching — none exist in this codebase; not being introduced here.

## Tech Stack

NestJS 11, Prisma (raw-SQL repository layer, not Prisma's query builder, per existing
`prisma-document.repository.ts`/`prisma-component.repository.ts` pattern), PostgreSQL, Jest for
unit/e2e tests, Bun as the runtime/tooling.

## Commands

```
Build:    bun run build
Lint:     bun run lint            (never bunx eslint directly — see docs/rules/workflow.md)
Test:     bun run test
Coverage: bun run test:cov
E2E:      bun run test:e2e        (needs a real reachable Postgres — see content-engine.e2e-spec.ts)
Dev:      bun run start:dev
Format:   bun run format          (Prettier; run on all changed .ts files before commit)
```

## Project Structure (relevant paths)

```
src/modules/document/application/services/
  bulk-create-publish.service.ts        → the loop being fixed
  bulk-create-publish.service.spec.ts   → existing unit coverage (rollback ordering, mode A/B)
  save-document.service.ts              → per-item save (schema resolve, findByVersion, upsert, components)
  publish-document.service.ts           → per-item publish (schema resolve, findByVersion x2, hydrate, upsert, components)
src/modules/document/application/support/
  schema-resolver.service.ts            → contentType.findUnique wrapper (candidate for hoist/cache)
  component-io.service.ts               → saveComponents/hydrateComponents (candidate for batching)
src/modules/document/infrastructure/persistence/
  prisma-document.repository.ts         → findByVersion / findManyByVersion (batched variant already exists, unused by bulk path)
  prisma-component.repository.ts        → upsertAll (per-field DELETE+INSERT)
test/
  content-engine.e2e-spec.ts            → real-Postgres e2e incl. bulk create+publish/delete (en-it-vocab)
docs/documents/document.md              → contract doc to update post-fix (§ Services — bulk)
```

## Code Style

Match existing service style exactly — constructor-injected dependencies, `execute()` entry point,
domain entities returned (not raw rows), no console/logger calls in the hot path (none exist today; keep
it that way). Example of the current per-item shape to preserve at the single-item level
(`save-document.service.ts:21-49`):

```ts
async execute(slug: string, data: Record<string, unknown>, documentId: string | undefined, userId: string | null): Promise<DocumentEntity> {
  const contentType = await this.schemaResolver.resolve(slug);
  assertKind(contentType, "collection");
  ...
  await this.prisma.$transaction(async (tx) => {
    await this.documents.upsert(slug, doc, contentType.fields, tx);
    await this.componentIo.saveComponents(slug, id, version, contentType.fields, data, tx);
  });
  return doc;
}
```

Any new batched/bulk-aware variants should live alongside these as new methods/services (e.g. a
bulk-specific overload that accepts a pre-resolved `contentType`), not as breaking signature changes to
methods reused by non-bulk routes.

## Testing Strategy

- **Unit tests** (Jest, colocated `*.spec.ts`): extend `bulk-create-publish.service.spec.ts` to cover the
  new chunked-concurrency rollback behavior — e.g. two items in the same concurrent chunk both fail (only
  one error should propagate, but both must be accounted for in rollback), a failure in a later chunk
  still rolls back items from earlier, already-committed chunks, and the empty-batch/single-item paths
  are unaffected. Mock-based, following existing patterns in that file.
- **E2E** (`test/content-engine.e2e-spec.ts`, real Postgres, per `docs/rules/bun.md` conventions): keep
  the existing 3-item bulk create+publish/delete assertions; add a benchmark case that runs a 50-item
  `en-it-vocab` bulk create+publish and asserts wall-clock time is captured (logged, not hard-asserted
  against a threshold per the "no fixed SLA" decision) so the before/after improvement is demonstrably
  visible in CI output.
- **Coverage:** per `docs/rules/workflow.md`, do not add `coverageThreshold` entries for Prisma
  repository files; do add/extend entries for any new/changed service file under
  `application/services`/`application/support` if it gets materially new branches.
- No manual browser verification needed (backend-only, no UI surface) — verify via `bun run test:cov`
  and `bun run test:e2e` plus the benchmark timing output.

## Boundaries

- **Always:** run `bun run lint`, `bun run test:cov`, and `bun run test:e2e` before considering any task
  done; run `bun run format` on changed `.ts` files; preserve the existing bulk create+publish
  request/response DTO shapes exactly; preserve the all-or-nothing rollback guarantee (only its internal
  ordering/chunking may change, never its outcome).
- **Ask first:** any change to a method signature shared with non-bulk call sites
  (`SaveDocumentService.execute`, `PublishDocumentService.execute`, `ComponentIoService` methods); any
  change to `IDocumentRepository`/`IComponentRepository` interfaces; picking the concrete chunk size for
  bounded concurrency (a Plan-phase decision, not locked here); any change to `docs/documents/document.md`
  beyond the bulk section.
- **Never:** introduce a spanning multi-item DB transaction (explicitly rejected — see Decisions);
  change the "missing/empty `data`" preserved gap; add search/webhook/caching infrastructure; touch
  `BulkDeleteService` or single-type services; commit without explicit user confirmation of the exact
  staged files + message (per user's global commit-confirmation rule).

## Success Criteria

- A 50-item `en-it-vocab` bulk create+publish request completes in materially less wall-clock time than
  the current ~5 minutes, demonstrated by a real e2e timing (before/after), not just a query-count
  argument.
- Redundant per-item `schemaResolver.resolve(slug)` calls are eliminated (resolved once per batch, not
  twice per item).
- The bulk-create path's guaranteed-empty `findByVersion` lookup (`documentId` always `undefined`) is
  eliminated or short-circuited.
- `findByVersion` lookups needed for publish are batched via the existing (currently unused by this path)
  `findManyByVersion` where the chosen concurrency design allows it.
- Component I/O (DELETE+INSERT per field, and per-parent-row for nested `syllableParts`) is batched at
  least within a single item's own transaction; cross-item batching is a stretch goal only if it doesn't
  require a spanning transaction.
- All-or-nothing rollback behavior is preserved and covered by new/updated unit tests for the chunked
  case.
- `docs/documents/document.md`'s bulk section is updated to describe the new concurrency/rollback
  ordering.
- `bun run lint`, `bun run test:cov`, and `bun run test:e2e` all pass.

## Open Questions

- Exact chunk size for bounded concurrency (5? 10? adaptive?) — left to the Plan phase; should consider
  Postgres connection pool size (check `PrismaService`/env config) so concurrency doesn't itself become a
  bottleneck or exhaust the pool.
- Whether cross-item component-I/O batching (a stretch goal above) is worth the added complexity given
  the per-item-transaction constraint — Plan phase should size this before committing to it.
