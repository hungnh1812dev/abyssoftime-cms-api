# Plan: Configure-Columns backend support — `PATCH .../list-fields` + `updatedBy`

See `SPEC.md` for the active spec pointer. This plan implements both FE requests
(`patch-content-type-list-fields.md`, `add-updated-by-field.md`) as one combined build cycle.

## Context

Two FE feature requests block the CMS-Admin's "Configure columns" UI, currently disabled. Investigation done
in the spec phase (direct file reads, no exploration needed):

- `ContentType.listFields` is a real DB column, but `ContentTypeSyncService.syncOne()` overwrites it from the
  JSON schema on **every app boot** — a naive PATCH would be silently reverted on next deploy.
- `DocumentEntity.updatedBy` (raw user id) is **already populated on every save** and already read off the
  row — this feature is "resolve id → name and expose it," not new tracking.
- `content-type` module must not import from `document` module (one-way arrow, `docs/documents/content-type.md`)
  — the orderBy field-kind allowlist (`SORTABLE_FIELD_TYPES`, `where-builder.ts:74`) currently lives on the
  wrong side of that boundary for Feature A to reuse in place; it needs relocating.
- `IUserRepository` has no batch lookup (`findById` only) — needed to avoid N+1 on the list endpoint.
- `projectFields()` (`list-documents.service.ts:62-68`) only reads `DocumentEntity.fields` — system columns
  (`updatedAt`, and the new `updatedBy`) named in `listFields` render as `null` today. Confirmed with the
  user: fix this as part of this work (`SPEC.md` Decision A-5).

## Dependency graph

```
Task 1 (relocate allowlist)  ──┬──▶ Task 4 (PATCH endpoint)  ──┐
                                └──▶ Task 7 (projectFields fix) │
Task 2 (findByIds)  ──▶ Task 5 (detail updatedBy)  ──▶ Task 6 (list updatedBy)  ──┼──▶ Task 7
Task 3 (override column + repo merge)  ───────────────▶ Task 4 ───────────────────┘
```

Tasks 1, 2, 3 have no dependencies on each other. Task 7 is the integration point and comes last.

## Key files

- `src/modules/content-type/application/sync/content-type-sync.service.ts` — must stay untouched by Task 3/4.
- `src/modules/content-type/infrastructure/persistence/prisma-content-type.repository.ts` — the single
  override-merge point (Task 3).
- `src/modules/document/infrastructure/persistence/sql/where-builder.ts` — allowlist relocation source (Task 1).
- `src/modules/document/application/services/list-documents.service.ts` — touched by both Task 6 and Task 7.
- `src/modules/document/presentation/document-response.mapper.ts` — stays pure/sync (Task 5).
- `src/bootstrap/seed-default-data.service.ts` — permission/role seed (Task 4).

## Confirmed decisions (from the Spec phase, restated)

1. `listFieldsOverride` is a **separate** DB column from the sync-owned `listFields` — merged at read time in
   `PrismaContentTypeRepository.toEntity()`. `ContentTypeSyncService` never reads/writes it.
2. New permission `content_type:manager`, granted to `super_admin` only (matches the existing `*:manager`
   pattern — every other manager permission is super_admin-only today).
3. `updatedBy` response shape: nested `{ documentId, name }`, not a flat string.
4. `updatedBy` scope: authenticated CMS-Admin routes only (`CollectionTypeDocumentController`,
   `SingleTypeDocumentController`); `PublicDocumentController` is not touched.
5. `projectFields` is extended to source system columns (incl. resolved `updatedBy`) for `listFields` entries
   — required for the FE's own `"updatedAt"` example, and for `updatedBy`, to actually render.
6. `listFields` must be non-empty — `400` on `[]`.

## Tasks

### Phase 1 — Foundational relocations (no user-facing behavior yet)

- [x] **Task 1:** Relocate `SORTABLE_FIELD_TYPES` (`where-builder.ts:74`) into
      `content-type/domain/entities/field-definition.ts` as `LISTABLE_FIELD_TYPES` (same values). Add new
      `LISTABLE_SYSTEM_COLUMNS: readonly string[]` = `["documentId", "status", "createdAt", "updatedAt", "publishedAt", "updatedBy"]`
      (response-DTO-facing, distinct from orderBy's SQL-facing `SYSTEM_SORTABLE_COLUMNS`, which is untouched).
      Update `where-builder.ts` to import `LISTABLE_FIELD_TYPES` instead of defining its own copy.
      - Verify: `where-builder.spec.ts`'s existing `sortableColumnsFor` tests pass unmodified (pure refactor).
        New coverage for the relocated/added constants in `field-definition.spec.ts`.
- [x] **Task 2:** Add `findByIds(ids: string[]): Promise<UserEntity[]>` to `IUserRepository` +
      `PrismaUserRepository` (`prisma.user.findMany({ where: { documentId: { in: ids } } })`). Empty input →
      `[]`, no query.
      - Verify: empty-input short-circuit, partial matches, no assumed result ordering.
- [x] **Task 3:** `prisma/postgresql/schema.prisma` — add `listFieldsOverride Json? @map("list_fields_override")`
      to `ContentType`. New migration (`ALTER TABLE "content_types" ADD COLUMN "list_fields_override" JSONB;`).
      `content-type.repository.ts` — add `updateListFields(slug, listFields): Promise<ContentTypeEntity>` to
      `IContentTypeRepository` (narrow method, not routed through `update()`). `prisma-content-type.repository.ts`
      — implement it (same `P2025` handling as `update()`/`delete()`); update `toEntity()` to merge
      `listFieldsOverride ?? listFields`.
      - Verify: `content-type-sync.service.spec.ts` passes with **zero edits** to `content-type-sync.service.ts`
        itself — proves the override column is invisible to sync logic by construction.
- [ ] **Checkpoint 1:** `bun run build && bun run lint && bunx jest src/modules/content-type src/modules/document/infrastructure/persistence/sql src/modules/users/infrastructure/persistence/prisma-user.repository.spec.ts`
      all green.

### Phase 2 — Feature A: `PATCH content-types/:slug/list-fields`

- [x] **Task 4:** `UpdateListFieldsDto` (`{ listFields: string[] }`, `@IsArray() @ArrayNotEmpty() @IsString({ each: true })`).
      `UpdateListFieldsService` — 404 on unknown slug; validate every entry is in `LISTABLE_SYSTEM_COLUMNS` or
      matches a `fields` entry with an eligible `LISTABLE_FIELD_TYPES` kind, else `400`; calls
      `contentTypes.updateListFields(...)`. `content-type.controller.ts` — new
      `@Patch(":slug/list-fields")`, `JwtAuthGuard` + `PermissionsGuard` + `@RequirePermissions("content_type:manager")`,
      returns `200 ContentTypeResponseDto`. Register the service in `content-type.module.ts`.
      `seed-default-data.service.ts` — add `content_type:manager` permission, grant to `super_admin` only.
      - Verify: valid PATCH → 200, persists across restart (override column); unknown field/disallowed
        kind/empty array → 400; unknown slug → 404; non-super_admin caller → 403.
- [x] **Checkpoint 1 (Feature A core):** `bun run build && bun run lint && bunx jest src/modules/content-type src/bootstrap/seed-default-data.service.spec.ts`
      green. Manual: `bun run start:dev`, PATCH a real content type, restart, confirm `GET` still reflects
      the override. **Commit here** (automated checks pass; this is a full vertical slice of Feature A).

### Phase 3 — Feature B: `updatedBy` on document responses

- [x] **Task 5:** `document.module.ts` — import `UserModule`. `document-response.mapper.ts` —
      `toDocumentResponse(document, status, updatedBy)` takes the already-resolved value, stays pure/sync.
      `document-response.dto.ts` — new `UpdatedByResponseDto { documentId; name }`; add
      `updatedBy?: UpdatedByResponseDto | null` to `DocumentDataResponseDto`. Both document controllers —
      inject `USER_REPOSITORY`, resolve via `findById` immediately before each `toDocumentResponse(...)` call
      (5 sites in collection-type, 2 in single-type); `null`/dangling id → `updatedBy: null`, never throws.
      `PublicDocumentController` is **not** touched.
      - Verify: every authenticated detail route returns resolved or `null` `updatedBy`;
        `public-document.controller.spec.ts` unmodified and still passing.
- [x] **Task 6:** `document-response.dto.ts` — add `updatedBy?: UpdatedByResponseDto | null` to
      `ListedDocumentItemResponseDto`. `list-documents.service.ts` — after fetching `rows`, one
      `USER_REPOSITORY.findByIds(...)` call for the page's unique non-null `updatedBy` ids, build a
      `documentId → {documentId,name}` map, attach to each item.
      - Verify: exactly one `findByIds` call per `execute()` regardless of page size/duplicates; `null`/dangling
        ids → `updatedBy: null`.
- [x] **Checkpoint 2 (Feature B core):** `bun run build && bun run lint && bunx jest src/modules/document src/modules/users`
      green. **Commit here.**

### Phase 4 — Integration: system columns in `projectFields`

- [ ] **Task 7:** `list-documents.service.ts` — `projectFields` (or its replacement): for each `listFields`
      entry, if the name is in `LISTABLE_SYSTEM_COLUMNS`, source it from the row's already-resolved values
      (`documentId`, `status` from the existing `statuses` map, `createdAt`/`updatedAt`/`publishedAt` off
      `row`, `updatedBy` from Task 6's resolved map) instead of `row.fields`; otherwise keep the existing
      `row.fields[name] ?? null` behavior.
      - Verify: `listFields: ["title", "updatedAt", "updatedBy"]` → `data.updatedAt` is the real timestamp,
        `data.updatedBy` is the resolved object — neither is `null`. `title` unaffected.
- [ ] **Checkpoint 3 (final, full integration):** `bun run build && bun run lint && bun test` (full suite)
      green. Manual walkthrough: `bun run start:dev` → PATCH `listFields` to include `"updatedAt"`/`"updatedBy"`
      → restart → GET content type (override survived) → hit collection-list route → confirm both render real
      values, not `null`. **Commit here.**

### Phase 5 — Docs

- [ ] `SPEC.md` — trim back to a one-line pointer (this repo's established convention).
- [ ] `docs/documents/content-type.md` — new PATCH route, `listFieldsOverride`, `content_type:manager`
      permission; correct the "read-only by design" framing (schema is read-only; `listFields` is now
      admin-mutable).
- [ ] `docs/documents/document.md` — `updatedBy` on responses.
- [ ] `docs/documents/users.md` — `findByIds`.
- [ ] `docs/cms-admin-integration.md` — both new/changed contracts.
- [ ] New `docs/documents/content-type-list-fields-techstack.md` — override-column-vs-alternatives comparison
      table (workflow.md's "Decision rationale" rule).
- [ ] **Checkpoint 4:** doc read-through, no stale "read-only"/"no updatedBy" mentions — commit.

### Phase 6 — Five-axis review + close-out

- [ ] Five-axis review (correctness / readability / architecture / security / performance).
- [ ] Address findings.
- [ ] **Checkpoint 5 (final):** all checks green after any fixes — commit.

## Verification (end-to-end)

1. `bun run build && bun run lint && bun test` (full suite) — all green, no regressions in
   `where-builder.spec.ts`, `content-type-sync.service.spec.ts`, `list-documents.service.spec.ts`,
   `public-document.controller.spec.ts`, etc.
2. `PATCH content-types/:slug/list-fields` persists across a restart; only `super_admin` can call it; bad
   input → 400; unknown slug → 404.
3. `updatedBy: { documentId, name } | null` on every authenticated collection-type/single-type route;
   `PublicDocumentController` responses unchanged.
4. `listFields` containing `"updatedAt"`/`"updatedBy"` renders real values in list `data`, not `null`.
5. Exactly one batch user lookup per list page, not one per row.
