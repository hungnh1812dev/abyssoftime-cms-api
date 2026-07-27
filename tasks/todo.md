# Todo — Content-Type-Schema-Driven CMS Document Engine

See `tasks/plan.md` for full context, dependency graph, and confirmed decisions.

## Phase 0 — Prisma model + migration + dir scaffold

- [x] `prisma/postgresql/schema.prisma` — `ContentType` model (`content_types` table)
- [x] `bun run prisma:migrate` — `add_content_types`
- [x] `bun run prisma:generate`
- [x] **Checkpoint 0:** `bun run build` succeeds

## Phase 1 — SQL foundations (pure, no DB, highest-risk-first)

- [x] `field-definition.ts` — `ContentKind`/`FieldType`/`FieldDefinition`/`isComponentField`
- [x] `sql-identifier.ts` + spec — `assertSafeSlug`/`assertSafeFieldName`/`quoteIdent` (the
      injection choke-point)
- [x] `table-naming.ts` + spec — `documentTableName`/`componentTableName` + hash-truncation
- [x] `field-type-mapping.ts` + spec — `FieldType → Postgres column type`
- [x] **Checkpoint 1:** schema-helper specs green, build clean

## Phase 2 — Content-type domain + loader/validator/differ (pure/fs, no DB)

- [x] `content-type.entity.ts`
- [x] `content-type.repository.ts` — `IContentTypeRepository` + `ContentTypeNotFoundError`
- [x] `schema-table.repository.ts` — `ISchemaTableRepository`
- [x] `schema-validator.ts` + spec
- [x] `schema-loader.service.ts` + spec
- [x] `schema-differ.ts` + spec — pure diff plan (add/drop/retype), no `DROP TABLE`
- [x] **Checkpoint 2:** content-type specs green (excl. persistence), typecheck clean

## Phase 3 — Content-type persistence (first DB-touching code)

- [x] `prisma-content-type.repository.ts` + spec
- [x] `prisma-schema-table.repository.ts` + spec — raw DDL, identifiers quoted, values
      parameterized, `information_schema` introspection
- [x] **Checkpoint 3:** persistence specs green, build clean

## Phase 4 — Content-type sync + services + controller + module

- [x] `content-type-sync.service.ts` + spec — `OnApplicationBootstrap`
- [x] `list-content-type.service.ts` + spec
- [x] `get-content-type.service.ts` + spec — exported for `document` module
- [x] `content-type.controller.ts` + spec — `/api/content-types`, read-only
- [x] `content-type.module.ts` — exports `GetContentTypeService` + `CONTENT_TYPE_REPOSITORY`
- [x] `app.module.ts` — register `ContentTypeModule`
- [x] **Checkpoint 4:** build/typecheck/lint/`test content-type` all clean — **commit here**

## Phase 5 — Document domain + SQL helpers + raw DML repos

- [x] `document.entity.ts`, `component.entity.ts`
- [x] `document.repository.ts`, `component.repository.ts` — ports w/ optional `tx` param
- [x] `row-mapper.ts` + spec
- [x] `where-builder.ts` + spec — `ILIKE` search + `ORDER BY` allowlist
- [x] `prisma-document.repository.ts` + spec — `tx ?? this.prisma`
- [x] `prisma-component.repository.ts` + spec — `tx ?? this.prisma`
- [x] **Checkpoint 5:** `document/infrastructure` specs green, build clean

## Phase 6 — Document support layer

- [x] `schema-resolver.service.ts` + spec
- [x] `draft-publish.policy.ts` + spec — mode A/B branching
- [x] `status-resolver.ts` + spec — incl. batch variant (no N+1)
- [x] `component-io.service.ts` + spec — recursive extract/hydrate/cascade, 3-level seeds
- [x] `list-query.parser.ts` + spec
- [x] **Checkpoint 6:** `document/application/support` specs green, typecheck clean

## Phase 7 — Document collection services

- [x] `save-document.service.ts` + spec — transactional
- [x] `publish-document.service.ts` + spec — mode B → 400
- [x] `unpublish-document.service.ts` + spec — mode B → 400
- [x] `get-document-for-edit.service.ts` + spec
- [x] `get-public-document.service.ts` + spec
- [x] `delete-document.service.ts` + spec — transactional
- [x] `list-documents.service.ts` + spec
- [x] `duplicate-document.service.ts` + spec
- [x] **Checkpoint 7:** collection service specs green

## Phase 8 — Bulk + single-type services

- [x] `bulk-create-publish.service.ts` + spec — compensating rollback
- [x] `bulk-delete.service.ts` + spec — partial success, no rollback
- [x] `get-single-type.service.ts` + spec
- [x] `save-single-type.service.ts` + spec — transactional
- [x] `publish-single-type.service.ts` + spec — mode B → 400
- [x] `unpublish-single-type.service.ts` + spec — mode B → 400
- [x] **Checkpoint 8:** all `document/application/services` specs green, build clean

## Phase 9 — Document presentation + DTOs + module wiring

- [x] `save-document.dto.ts`, `bulk-create.dto.ts`, `bulk-delete.dto.ts`, `list-query.dto.ts`
- [x] `single-type-document.controller.ts` + spec
- [x] `collection-type-document.controller.ts` + spec — `/bulk` routes before `/:documentId`
- [x] `public-document.controller.ts` + spec — no guards
- [x] `document.module.ts` — imports `ContentTypeModule`
- [x] `app.module.ts` — register `DocumentModule`
- [x] **Checkpoint 9:** build/typecheck/lint/`test document` all clean

## Phase 10 — Seed permissions + seed JSON

- [x] `seed-default-data.service.ts` — add 7 slugs (`content_type:read`, `document:read/create/
      update/delete/publish/unpublish`); all 7 → `super_admin`; `content_type:read`+`document:read`
      → `admin`
- [x] `seed-default-data.service.spec.ts` — update counts/ordered-slug/permissions-array assertions
- [x] `content-types/cv-page.json` — adopted + `"draftToPublish": true`
- [x] `content-types/en-it-vocab.json` — adopted + `"draftToPublish": true`
- [ ] **Checkpoint 10:** build/typecheck/lint/`test:cov` all clean — **commit here**

## Phase 11 — e2e (real Postgres, manual/flagged if unreachable)

- [x] `test/content-engine.e2e-spec.ts` — boot sync creates real tables; mode-A full lifecycle;
      mode-B 400 on publish; 401/403; bulk happy/partial; 3-level component round-trip; schema-edit
      data preservation
- [x] **Checkpoint 11:** `bun run test:e2e` green against reachable Postgres (grant the 7 new slugs
      to pre-existing `super_admin`/`admin` roles via `PUT /api/roles/:id` if needed — same
      expected gap as the media cycle)

## Phase 12 — Docs

- [x] `docs/documents/content-type.md`
- [x] `docs/documents/document.md`
- [x] `docs/ENTRYPOINT.md` — add index lines
- [x] `SPEC.md` — trim to pointer line
- [x] **Checkpoint 12:** doc read-through — commit
