# Spec: Document I/O Performance + Rollback Guarantee

## Objective

Live CV updates (`PUT /api/v1/documents/collection-type/cv-page/:documentId`) take ~1-3s in production
(Render.com web service + Postgres) versus near-instant locally. Investigation found the root cause is
generic to the whole document module, not specific to CV: every mutating/reading document service funnels
through `ComponentIoService`, which walks each content type's component tree with **one sequential,
unbatched raw-SQL round trip per component field, repeated per parent row for nested components** — no
`Promise.all`, no batching across sibling fields. `cv-page` is simply the worst case in this schema (6
top-level component fields, one nested 2 levels deep: `experiences → roles`), so it surfaces the problem
most visibly, but every collection-type and single-type route pays the same tax proportional to its own
component-field count.

Additionally, the user has confirmed a correctness requirement alongside the performance fix: every
multi-step document action (create/update/publish/unpublish/delete/duplicate/bulk) must roll back to its
pre-action state if any step fails — no partially-applied writes ever left visible to a reader.

**User:** any CMS-Admin/API consumer editing collection-type or single-type content with component fields
(the reported case is editing `cv-page`, but the fix benefits every content type).

**Success looks like:** a `cv-page` update completes in materially less wall-clock time than today's 1-3s,
verified by a real before/after timing (no fixed SLA — see Success Criteria), with identical response
shape everywhere except the one deliberately-changed contract (bulk delete, see Decisions), and every
action's rollback guarantee preserved or strengthened, never weakened.

### Diagnosis (from investigation)

**Performance — `ComponentIoService`** (`src/modules/document/application/support/component-io.service.ts`):

- `saveComponents` (lines 22-33) loops over a content type's component fields and `await`s
  `saveComponentField` for each **one at a time**, no `Promise.all`.
- `saveComponentField` (lines 35-67) itself loops over every item of a repeatable field and, per item,
  recurses into nested component fields — again fully sequential (lines 53-65).
- Each leaf call reaches `PrismaComponentRepository.upsertAll` (`prisma-component.repository.ts:33-71`),
  which is already efficient *per call* (one batched `DELETE` + one multi-row `INSERT`), but the number of
  calls is what explodes: `cv-page`'s 6 top-level component fields + 1 nested-per-experience-item field
  means ~9-15+ sequential DELETE/INSERT pairs (18-30+ round trips) for a typical edit.
- **Correction (found during planning, not investigation):** `hydrateComponents`/`hydrateRows`
  (lines 69-115) do **not** mirror the write path's fan-out. `hydrateRows` pre-fetches all rows for a
  nested field name **once** before recursing into each parent row (`component-io.service.ts:96-101`), so
  reads already issue exactly one `SELECT` per distinct component path in the schema (7 for `cv-page`),
  independent of item count — the same shape `deleteByDocument` has (it deletes by `document_id` alone, no
  parent scoping at all). Both are already schema-bounded; no changes were needed on the read or delete
  side. The one real bottleneck is `saveComponentField`, which — unlike `hydrateRows` — recurses **per
  item** instead of pre-batching across parents; see `tasks/plan.md`'s Context section for the corrected
  diagnosis and the fix that came out of it.

**Correction (continued):** only the *write-path* callers of `saveComponents` actually inherit the
per-item scaling bug — `save-document.service.ts:54-57`, `duplicate-document.service.ts:42`,
`save-single-type.service.ts:45` (and transitively `publish-document.service.ts:47`/
`publish-single-type.service.ts:39`, which call `saveComponents` on the copied-forward published row).
Every *read-path* caller (`get-document-for-edit.service.ts:33`, `get-public-document.service.ts:26`,
`list-documents-full.service.ts:49`, `get-single-type`/`get-public-single-type`) and *delete-path* caller
(`unpublish-document.service.ts:30`, `delete-document.service.ts:32-33`,
`unpublish-single-type.service.ts:30`) only calls `hydrateComponents`/`deleteComponents`, both already
schema-bounded — they pay a small fixed cost (7 calls for `cv-page`), not one that scales with item count.
A single `PUT` on `cv-page` chains a write fan-out (`save-document.service.ts`, the one that scales) *and*
a fixed-size read fan-out (`get-document-for-edit.service.ts`, called by the controller right after save to
build the response — `collection-type-document.controller.ts:142-144`) — the read adds a small constant
overhead on top, it does not double the write's own (data-dependent) round-trip count.

On a local Postgres (sub-millisecond round trips) this is invisible. On Render.com, if the Postgres
instance isn't colocated with the web service or is on a lower tier, each round trip can cost tens of
milliseconds; 30-45 of them stacking up linearly matches the reported 1-3s exactly.

**Rollback — current state per service** (all read directly, not inferred):

| Service | Write wrapped in one `$transaction`? | Gap |
| --- | --- | --- |
| `save-document.service.ts` | Yes (`upsert` + `saveComponents`, lines 54-57) | none at the write level |
| `publish-document.service.ts` | Yes (lines 45-48) | none |
| `unpublish-document.service.ts` | Yes (lines 29-32) | none |
| `delete-document.service.ts` | Yes (lines 31-35) | none |
| `duplicate-document.service.ts` | Yes (lines 40-43) | none |
| `save-single-type.service.ts` / `publish-single-type.service.ts` / `unpublish-single-type.service.ts` | Yes, same pattern | none |
| `bulk-create-publish.service.ts` | No spanning transaction (deliberate, per existing `document.md:145`); compensating `DeleteDocumentService` rollback on any chunk failure | already matches the all-or-nothing requirement |
| `bulk-delete.service.ts` | No — loops `DeleteDocumentService.execute` independently per ID, catches and collects each error, **no rollback** (`document.md:146`) | **conflicts with the new requirement** — confirmed with user to fix (see Decisions) |
| Controller-level post-write reads (e.g. `GetDocumentForEditService` called after `save-document` commits, `SingleTypeDocumentController`'s re-read after `PUT`) | N/A — read-only, happens after the write's own transaction already committed | confirmed with user as **out of scope** — write-transaction atomicity is sufficient (see Decisions) |

So every single-item action already satisfies "roll back to pre-action state if any step fails" at the DB
level. The only real gap is `bulk-delete.service.ts`.

## Decisions (confirmed with user)

1. **Performance fix is document-wide**, not CV-specific: batch/parallelize inside `ComponentIoService`
   (the shared root cause) so every caller listed in Diagnosis benefits, not just `save-document.service.ts`.
2. **Post-write reads (response hydration) are out of scope for rollback.** Once a service's own
   `$transaction` commits, that write is correct and final. A failure while building the HTTP response
   afterward (e.g. `GetDocumentForEditService`) is not compensated — existing behavior is kept as-is. This
   fix must not regress it either (no new post-write step should be introduced that isn't covered by the
   write's own transaction).
3. **`bulk-delete.service.ts` becomes all-or-nothing.** Any item's delete failing must roll back every
   delete in that batch — no partial deletes ever left committed. Because delete is pure removal (no
   created rows to compensate away, unlike bulk-create+publish), the correct mechanism is a **single
   spanning DB transaction** across all items' deletes in the batch, not a compensating "restore" (nested
   component rows are not naturally re-creatable after deletion). This is a deliberate divergence from
   `bulk-create-publish.service.ts`'s explicit "no spanning transaction" decision — that decision was
   scoped to create+publish's bounded-concurrency design; delete has no such constraint and a spanning
   transaction is both simpler and safer here.
   - This changes `bulk-delete.service.ts`'s existing contract: today it always returns `200` with
     `{ deleted: string[], failed: {documentId, error}[] }` for partial success
     (`document.md:146,175`). Under all-or-nothing, "partial" can no longer happen — on any failure the
     whole batch throws (propagating the original error, same as `bulk-create-publish.service.ts`) instead
     of returning a mixed result. `DELETE :slug/bulk`'s documented response shape and `document.md`'s
     endpoint table must be updated to reflect this (single success shape, or a thrown error — no more
     `failed` array).
   - Requires adding an optional `tx?: Prisma.TransactionClient` parameter to
     `DeleteDocumentService.execute()` (mirroring the existing optional-param pattern already used by
     `SaveDocumentService`/`PublishDocumentService` for the bulk-create-publish fix), so
     `BulkDeleteService` can open one outer transaction and pass it down to every item's delete.
4. **No fixed performance SLA.** Same approach as the prior bulk-create-publish fix
   (`docs/specs/bulk-create-publish-performance.md`, now cleaned up — recovered via `git show 60711c8`):
   success is judged by a real before/after wall-clock benchmark on `cv-page`, not a hard threshold.

## Scope

**In scope:**
- `ComponentIoService` (`saveComponents`/`saveComponentField`, `hydrateComponents`/`hydrateRows`,
  `deleteComponents`/`deleteComponentField`) — the shared root cause. Batch/parallelize sibling
  component-field calls and sibling repeatable-item calls wherever doing so doesn't require a query to
  leave its caller's existing transaction boundary.
- `PrismaComponentRepository`/`PrismaDocumentRepository` only if a batching change requires a new
  repository method (e.g. a multi-row-group variant of `upsertAll`/`findByDocument`) — prefer extending
  these over changing their existing method contracts, since they're reused by every service.
- `bulk-delete.service.ts` + `delete-document.service.ts` (adding the optional `tx` param) — the
  all-or-nothing rollback fix.
- `document.md` update for: the new `ComponentIoService` batching behavior, and `bulk-delete`'s new
  all-or-nothing contract (response shape + endpoint table).
- Swagger/DTO doc update if `DELETE :slug/bulk`'s response shape changes (per the response-shape rule in
  `docs/rules/workflow.md` step 5).

**Out of scope:**
- Any change to single-item services' existing transaction boundaries beyond what's needed to keep them
  correct while `ComponentIoService` batches internally — `save-document.service.ts`,
  `publish-document.service.ts`, etc. already wrap their writes correctly today (see Diagnosis table) and
  don't need new rollback machinery, only to keep working as `ComponentIoService`'s internals change.
  `SaveDocumentService.execute`, `PublishDocumentService.execute`, `ComponentIoService`'s existing method
  *signatures* stay stable (bulk-create-publish and other callers depend on them) — batching is an
  internal implementation change, not a signature change, except where Decision 3 explicitly requires one
  (`DeleteDocumentService`'s new optional `tx` param).
- Compensating rollback for post-write/response-building steps (Decision 2 — explicitly rejected).
- `bulk-create-publish.service.ts`'s existing compensating-rollback design — already correct, not touched
  beyond whatever perf benefit it inherits automatically from `ComponentIoService` being faster.
- Any change to permission/guard behavior, request DTOs, or non-document modules (auth, media, roles,
  etc.).
- Introducing caching, search indexing, or webhooks — none exist in this codebase.

## Tech Stack

NestJS 11, Prisma (raw-SQL repository layer per existing `prisma-document.repository.ts`/
`prisma-component.repository.ts` pattern — not Prisma's query builder), PostgreSQL, Jest for unit/e2e
tests, Bun as the runtime/tooling.

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
src/modules/document/application/support/
  component-io.service.ts               → the shared root cause (saveComponents/hydrateComponents/deleteComponents)
src/modules/document/infrastructure/persistence/
  prisma-component.repository.ts        → upsertAll/findByDocument/deleteByDocument (per-call already batched)
  prisma-document.repository.ts         → findByVersion/findManyByVersion/upsert
src/modules/document/application/services/
  save-document.service.ts, publish-document.service.ts, unpublish-document.service.ts,
  delete-document.service.ts, duplicate-document.service.ts,
  get-document-for-edit.service.ts, get-public-document.service.ts, list-documents-full.service.ts,
  save-single-type.service.ts, publish-single-type.service.ts, unpublish-single-type.service.ts,
  get-single-type.service.ts, get-public-single-type.service.ts, list-documents.service.ts
                                         → all consume ComponentIoService, inherit its perf automatically
  bulk-delete.service.ts                → rewrite for all-or-nothing (spanning transaction)
  bulk-create-publish.service.ts        → unchanged, benefits from ComponentIoService perf only
test/
  content-engine.e2e-spec.ts            → real-Postgres e2e; extend with cv-page timing + bulk-delete rollback case
docs/documents/document.md              → update "Services" sections + bulk-delete endpoint table
content-types/cv-page.json              → the worst-case schema used for the before/after benchmark
```

## Code Style

Match existing service/support style exactly — constructor-injected dependencies, `execute()` entry
points, domain entities returned (not raw rows), no console/logger calls in the hot path. Batching changes
inside `ComponentIoService` should use `Promise.all` over independent async calls wherever they don't need
to run in caller-request order relative to each other (sibling component fields are independent by
construction — different tables, no shared rows). Keep the recursive shape (path-building via
`componentPath`) intact; only the sequential-`await` loops become `Promise.all`.

## Testing Strategy

- **Unit tests** (Jest, colocated `*.spec.ts`): extend `component-io.service.spec.ts` to assert sibling
  component fields/items are dispatched concurrently (not sequentially) and that ordering of writes within
  a single component's own DELETE→INSERT pair is preserved (that ordering is correctness-critical, not
  just performance). Rewrite `bulk-delete.service.spec.ts` for the new all-or-nothing behavior: all-success
  case, failure on the first item rolls back nothing committed, failure on a later item rolls back every
  earlier item in the same batch, empty-array case unaffected.
- **E2E** (`test/content-engine.e2e-spec.ts`, real Postgres): add a `cv-page` update benchmark that logs
  wall-clock duration (no hard threshold, per Decision 4) so the before/after improvement is visible in
  output; add a bulk-delete case asserting that a failing item (e.g. an unknown ID mixed into a real
  batch) leaves **zero** documents deleted, not a partial set.
- **Coverage:** per `docs/rules/workflow.md`, no `coverageThreshold` entries for Prisma repository files
  or controllers; add/extend entries for `component-io.service.ts`/`bulk-delete.service.ts` if they gain
  materially new branches.
- No manual browser verification needed (backend-only) — verify via `bun run test:cov` and
  `bun run test:e2e` plus the benchmark timing output; optionally spot-check the live Render deployment's
  `PUT cv-page` latency after deploy, since that's the originally reported symptom.

## Boundaries

- **Always:** run `bun run lint`, `bun run test:cov`, and `bun run test:e2e` before considering any task
  done; run `bun run format` on changed `.ts` files; preserve every existing single-item service's
  transaction-level rollback guarantee (Diagnosis table) — never move a write outside its transaction in
  the name of parallelizing it; preserve `ComponentIoService`'s existing public method signatures (only
  `DeleteDocumentService.execute` gains a new optional trailing param).
- **Ask first:** any change to `IComponentRepository`/`IDocumentRepository` interfaces; any change to
  `bulk-create-publish.service.ts`'s existing chunking/rollback design; the exact
  `DELETE :slug/bulk` response shape once it's no longer `{ deleted, failed }` (propose the new shape
  before implementing); committing without explicit user confirmation of the exact staged files + message.
- **Never:** introduce a spanning transaction for `bulk-create-publish` (Decision 3 explicitly scopes
  spanning transactions to delete only, per its own rationale — create+publish's rejection stands);
  weaken any currently-atomic single-item write; add search/webhook/caching infrastructure; touch
  single-type's absent-delete/duplicate boundary (`document.md:167`).

## Success Criteria

- A `cv-page` update completes in materially less wall-clock time than today's 1-3s baseline, demonstrated
  by a real e2e timing (before/after), not just a query-count argument.
- **Superseded by the actual implementation** — `ComponentIoService`'s sibling repeatable-item calls are
  batched into a single `upsertAll` per component path (one round trip per level, not one per parent row),
  not run concurrently via `Promise.all`. `tasks/plan.md`'s Design section explains why: queries on one
  Prisma transaction's single reserved connection serialize at the wire level regardless of JS-side
  concurrency, so `Promise.all` here would add complexity without reducing round trips — the batching
  itself, not concurrency, is what cuts the round-trip count. `hydrateComponents`'s read path needed no
  change at all (see the corrected Diagnosis above).
- Every currently-atomic single-item service (Diagnosis table) remains atomic — no regression, covered by
  existing/updated unit tests.
- `bulk-delete.service.ts` is all-or-nothing: any item failure leaves zero deletes committed, covered by a
  new e2e case.
- `docs/documents/document.md` reflects the new `ComponentIoService` batching behavior and `bulk-delete`'s
  updated contract (response shape + endpoint table).
- `bun run lint`, `bun run test:cov`, and `bun run test:e2e` all pass.

## Open Questions

- Exact concurrency mechanism for `ComponentIoService`'s batching (`Promise.all` across sibling raw-SQL
  calls on the same `tx` client vs. any risk of exhausting the Postgres pool under nested fan-out) — size
  this in the Plan phase, considering `PrismaService`'s configured pool size (same consideration the prior
  bulk-create-publish spec flagged for its own concurrency).
- Whether `bulk-delete`'s new spanning transaction needs an upper bound on batch size (a very large ID
  array holding one long-lived transaction/connection) — Plan phase should check if `BulkDeleteDto` already
  caps array length; if not, decide whether to add one.
- Exact new response shape for `DELETE :slug/bulk` on success (still `{ deleted: string[] }` with no
  `failed` field? or the plain document-count?) — flagged above as an explicit ask-first item, to propose
  during Plan phase before implementation.
