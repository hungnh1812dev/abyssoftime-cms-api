# Todo — Configure-Columns backend support (`list-fields` PATCH + `updatedBy`)

See `tasks/plan.md` for full context and rationale.

## Phase 1 — Foundational relocations
- [x] Task 1 — relocate `LISTABLE_FIELD_TYPES`/`LISTABLE_SYSTEM_COLUMNS` into `content-type` module; `where-builder.ts` imports from there
- [x] Task 2 — `IUserRepository.findByIds` + Prisma implementation
- [x] Task 3 — `listFieldsOverride` column + migration + repository merge in `toEntity()`
- [x] **Checkpoint 1:** build/lint/test green

## Phase 2 — Feature A: `PATCH .../list-fields`
- [x] Task 4 — DTO + `UpdateListFieldsService` (validation) + controller route + `content_type:manager` permission (super_admin only)
- [x] **Checkpoint 1 (Feature A core):** build/lint/test green; manual restart-survives-override check — commit

## Phase 3 — Feature B: `updatedBy`
- [x] Task 5 — detail responses: `UserModule` import, mapper param, DTO field, both controllers resolve via `findById`, public controller untouched
- [ ] Task 6 — list responses: DTO field, batched `findByIds` resolution in `ListDocumentsService`
- [ ] **Checkpoint 2 (Feature B core):** build/lint/test green — commit

## Phase 4 — Integration
- [ ] Task 7 — `projectFields` sources system columns (incl. resolved `updatedBy`) instead of only `row.fields`
- [ ] **Checkpoint 3 (final, full integration):** full test suite green; manual end-to-end walkthrough — commit

## Phase 5 — Docs
- [ ] `SPEC.md` trimmed to pointer
- [ ] `docs/documents/content-type.md`, `document.md`, `users.md`, `docs/cms-admin-integration.md` updated
- [ ] New `docs/documents/content-type-list-fields-techstack.md` (decision-rationale table)
- [ ] **Checkpoint 4:** doc read-through — commit

## Phase 6 — Review + close-out
- [ ] Five-axis review (correctness / readability / architecture / security / performance)
- [ ] Address findings
- [ ] **Checkpoint 5 (final):** all checks green — commit
