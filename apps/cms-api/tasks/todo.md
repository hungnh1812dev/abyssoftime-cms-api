# Todo — Document I/O Performance + Bulk-Delete Rollback

See `tasks/plan.md` for full context, design, and rationale. See
`docs/specs/document-io-performance-and-rollback.md` for the full spec.

## Phase 1 — Component I/O batching (the perf fix)
- [x] Task 1 — `IComponentRepository`/`PrismaComponentRepository.upsertAll`: new `parentComponentIds: (string | null)[]` param replacing single `parentComponentId`; DELETE branches on `IS NULL` (top-level) vs. `= ANY($n::uuid[])` (nested); INSERT uses each entity's own `.parentComponentId`. Tests: `IS NULL` branch, `ANY(...)` branch, empty-entities-but-nonempty-parentIds (pure delete, no insert).
- [ ] Task 2 — `ComponentIoService.saveComponents`/`saveComponentField` → rewrite as breadth-first `saveComponentTree`, batching all parents at one (documentId, componentPath) level into a single `upsertAll` call. Tests: extend existing 3-level nesting spec (`component-io.service.spec.ts`) to assert `upsertAll` called exactly once per component path (not once per parent); empty-nested-items parent still contributes to the DELETE scope.
- [ ] **Checkpoint A:** `bun run test:cov` green for both files, `bun run lint` clean, no other spec files broken — commit.

## Phase 2 — Bulk delete all-or-nothing
- [ ] Task 3 — `delete-document.service.ts`: add optional `tx?: Prisma.TransactionClient` param; use it directly when provided instead of opening a new `$transaction`; existence-check reads stay pool-scoped (unchanged, matches existing pattern).
- [ ] Task 4 — `bulk-delete.service.ts` rewrite: inject `PrismaService`; wrap the per-ID loop in one spanning `$transaction`, passing `tx` to each `deleteDocument.execute` call; return `string[]` (deleted IDs) instead of `BulkDeleteResult[]`; remove the per-item try/catch (a failure now throws and rolls back the whole batch).
- [ ] Task 5 — Controller (`collection-type-document.controller.ts`) + DTOs: `bulkDelete` handler returns `{ deleted: string[] }` (drop `failed`); `BulkDeleteResponseDto` drops `failed`/`BulkDeleteFailureDto`; update `@ApiOperation` summary (no longer "no rollback on partial failure").
- [ ] Task 6 — Rewrite `bulk-delete.service.spec.ts` for all-or-nothing (all-success returns all IDs; a failing ID rolls back every delete in the batch; empty array short-circuits without opening a transaction); extend `delete-document.service.spec.ts` for the new optional `tx` param.
- [ ] **Checkpoint B:** `bun run test:cov` and `bun run lint` green — commit.

## Phase 3 — E2E verification
- [ ] Task 7 — `content-engine.e2e-spec.ts`: add a `cv-page` update wall-clock benchmark (same `Date.now()` pattern as the existing 50-item bulk-create benchmark), logged duration, no hard threshold assertion.
- [ ] Task 8 — `content-engine.e2e-spec.ts`: bulk-delete all-or-nothing case — mix one unknown ID into a real batch, assert the request fails and zero documents were actually deleted (verify via `GET`), replacing/extending the existing bulk-delete assertions.
- [ ] **Checkpoint C:** `bun run test:e2e` green, timing improvement visible in output — commit.

## Phase 4 — Docs + workflow closeout
- [ ] Task 9 — Update `docs/documents/document.md`: "Services — bulk" bulk-delete line + the endpoint table row (all-or-nothing behavior, new `{ deleted }` response shape); note the `ComponentIoService` batching behavior in the relevant services section.
- [ ] Task 10 — Correct `docs/specs/document-io-performance-and-rollback.md`'s Diagnosis section (the read-side/hydrate fan-out claim was wrong — already schema-bounded, no changes were needed there); run five-axis review (correctness/readability/architecture/security/performance); delete the spec file as cleanup step.
- [ ] **Checkpoint D (final):** `bun run build && bun run lint && bun run test:cov && bun run test:e2e` all green; docs updated; spec cleaned up — commit.
