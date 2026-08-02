# Todo — Bulk Create+Publish Performance Fix

See `tasks/plan.md` for full context, design, and rationale. See
`docs/specs/bulk-create-publish-performance.md` for the full spec.

## Phase 1 — Single-item service changes (benefit bulk AND non-bulk callers)
- [x] Task 1 — `save-document.service.ts`: optional `contentType` param; skip `findByVersion` when `documentId` is undefined; `withScalarDefaults` normalization fix. Tests: omitted-optional-field → `null`, 5-arg skips resolve, Mode B + `documentId=undefined`.
- [x] Task 2 — `publish-document.service.ts`: optional `contentType`/`draftOverride`/`isNewDocument` params. Tests: `draftOverride` correctness (component keys still overwritten, scalar keys preserved), `isNewDocument` skip.
- [x] **Checkpoint A:** `bun run test:cov` green for both files, `bun run lint` clean, no other spec files broken — commit.

## Phase 2 — Bulk service rewrite
- [x] Task 3 — Rewrite `bulk-create-publish.service.ts`: inject `SchemaResolverService`, hoist resolve, `CHUNK_SIZE = 5` chunked processing via `processItem`/discriminated outcomes, preserve rollback-on-any-failure + original item ordering.
- [x] Task 4 — Full rewrite of `bulk-create-publish.service.spec.ts` (existing suite is order-dependent, breaks under chunking). Cover: all-success across 2+ chunks; failure on very first item; failure in a later chunk rolls back prior chunks + same-chunk successes; two failures in same chunk; save-fails-before-publish vs. publish-fails-after-save; chunk-boundary batch sizes (`CHUNK_SIZE`, `CHUNK_SIZE + 1`); single-item batch.
- [x] **Checkpoint B:** `bun run test:cov` and `bun run lint` green — commit.

## Phase 3 — E2E verification
- [x] Task 5 — Extend `test/content-engine.e2e-spec.ts`: 50-item `en-it-vocab` bulk create+publish case logging wall-clock duration (no hard threshold assertion); assert response shape + all 50 persisted+published; confirm existing 3-item case still passes.
- [x] **Checkpoint C:** `bun run test:e2e` green, timing improvement visible in output — commit.

## Phase 4 — Docs + workflow closeout
- [x] Task 6 — Update `docs/documents/document.md`'s "Services — bulk" section: schema resolved once per batch; chunked concurrency (`CHUNK_SIZE = 5`); rollback still all-or-nothing but failure-ordering no longer strictly request-order within a chunk; note eliminated redundant lookups.
- [x] Task 7 — Update `docs/specs/bulk-create-publish-performance.md` to reflect final implementation; run five-axis review (correctness/readability/architecture/security/performance); delete the spec file as cleanup step.
- [x] **Checkpoint D (final):** `bun run build && bun run lint && bun run test:cov && bun run test:e2e` all green; docs updated; spec cleaned up — commit.
