# Plan: Content-Type-Schema-Driven CMS Document Engine

See `SPEC.md` for the active spec (709 lines — binding source of truth for every design decision
below). This plan builds two new modules — `src/modules/content-type/` and
`src/modules/document/` — a stack adaptation of the Go/GORM/MongoDB `covert/**` reference onto
NestJS/Prisma/PostgreSQL raw SQL, **not** a verbatim port. This is a `[CAREFUL]`-tagged feature
(`docs/rules/workflow.md`) — Opus was used for the Spec and this Plan phase.

## Context

Content types are declared as JSON files (`content-types/*.json`) and reconciled into dedicated
PostgreSQL tables by a boot-time sync engine (`ContentTypeSyncService`, `OnApplicationBootstrap`).
A single generic Document engine then serves full CRUD + draft/publish + list/search/sort/
pagination + bulk operations over *any* declared content type, dispatching purely on the URL
`:slug` and the resolved schema — no per-content-type backend code. Two real content types ship as
seeds (`cv-page`, `en-it-vocab`, adopted from `covert/content-type/*.json`), each nesting
repeatable components up to 3 levels deep.

The build order is forced by a hard dependency chain: SQL-safety foundations (pure, no DB) →
content-type domain/sync/persistence → content-type application surface (commit point) → document
domain/persistence (blocked on content-type's exports) → document support layer → document
services → document presentation (commit point) → seed/permission wiring → e2e. `document` depends
on `content-type` one-way only (never the reverse) — enforced by keeping the DDL-lifecycle port
(`ISchemaTableRepository`) inside `content-type`, not on `IDocumentRepository` (a deliberate
deviation from the reference's port shape, SPEC §8.3).

Two decisions were resolved with the user during this Plan phase (not covered during Spec):

1. **Both seed content types use `draftToPublish: true`** — reference-style draft/publish workflow
   for both `cv-page` and `en-it-vocab`.
2. **Multi-table writes (a document row + its component rows, recursively) are wrapped in a single
   Postgres transaction** via `prisma.$transaction`, rather than left as separate non-transactional
   statements — an improvement over the Go reference (which had no transaction abstraction at all).
   `IDocumentRepository`/`IComponentRepository` DML methods take an optional trailing
   `tx?: Prisma.TransactionClient` parameter, defaulting to the injected `PrismaService` when
   omitted; `SaveDocumentService`/`PublishDocumentService`/`DeleteDocumentService` (and their
   single-type twins) open the transaction and pass `tx` down through `component-io.service.ts`
   into the component repository calls. DDL (Phase 3's `prisma-schema-table.repository.ts`) is not
   required to use this — Postgres DDL is itself transactional per-statement-block, and sync only
   ever processes one content type's diff at a time, so the risk there is low; wrapping a single
   content type's CREATE/ALTER/DROP sequence in its own transaction is a reasonable implementation
   choice but not a hard requirement.

## Key files

- `src/modules/media/infrastructure/persistence/prisma-media.repository.ts` — repository /
  `toEntity` / P2025-catch shape to mirror for `prisma-content-type.repository.ts`.
- `src/modules/media/presentation/media.controller.ts`, `src/modules/media/media.module.ts` —
  per-route `@UseGuards(JwtAuthGuard, PermissionsGuard)` + `@RequirePermissions(...)` controller
  pattern, and `{ provide: TOKEN, useClass: ... }` + `exports` module-wiring pattern, copied for
  both new modules.
- `src/bootstrap/seed-default-data.service.ts` + `.spec.ts` — additive, `findBySlug`-idempotent
  permission/role seeding; the exact order-sensitive `toHaveBeenCalledTimes`/`toEqual` assertions
  that need updating (mirrors how `media:manager`/`media:read` were added last cycle).
- `src/prisma/application/prisma.service.ts`, `src/prisma/prisma.module.ts` — `@Global()`
  `PrismaService` (`PrismaClient` + `@prisma/adapter-pg`), what all raw SQL and the new
  `$transaction` usage builds on. **Zero prior raw-SQL usage anywhere in `src`** — this feature is
  the first; Phase 1 exists specifically to build the injection-safety foundation before any DDL/
  DML code touches a real query.
- `src/config/env.validation.ts:63-65` — `CONTENT_TYPES_DIR: string = "content-types"` already
  exists (added early in repo history, unused until now) — no new env var needed.
- `test/utils/app-test.util.ts`, `test/media.e2e-spec.ts` — `bootTestApp`, the direct-`User`-row +
  `JwtTokenService.signAccessToken(...)` JWT shortcut (no real register/login HTTP round trip),
  cookie-based `access_token` auth, `runId = randomUUID().slice(0,8)` test isolation — reused for
  the Phase 11 e2e suite.
- `covert/content-type/cv-page.json`, `covert/content-type/en-it-vocab.json` — the two seeds to
  adopt (each gets `"draftToPublish": true` added at the root).

## Confirmed decisions (resolved with the user during Spec + this Plan phase)

1. **Storage**: per-content-type dynamic Postgres tables (`documents_<slug>`,
   `components_<slug>__<path>`) via raw SQL, mirroring the Go reference's approach — not a single
   shared JSON-column table. PostgreSQL-only; `prisma/mysql`/`prisma/sqlite` stay untouched empty
   stubs.
2. **v1 scope**: full reference parity minus locale. Bulk create+publish, bulk delete, search
   (`?search=`), dynamic sort allowlist (`?orderBy=`/`?sortDir=`), and pagination are all in scope.
   `locale` is dropped everywhere (no column, no query param, no `/api/locales` route). REST-only
   (no gRPC), API-only (no admin frontend exists in this repo).
3. **Seed content types**: `covert/content-type/cv-page.json` and `.../en-it-vocab.json` are
   adopted as the real, actual seed content types for this feature (not just reference material),
   each with `"draftToPublish": true` added.
4. **Schema-change reconciliation**: diff-based `ADD`/`DROP`/`ALTER COLUMN`, **never**
   `DROP TABLE`+recreate — data for unchanged fields must survive a schema edit. An incompatible
   `ALTER COLUMN ... TYPE` falls back to drop-old-column + add-new-column (that one field's data is
   lost, everything else survives) with a `logger.warn` — matches SPEC §6.2's default; the
   alternative (abort boot, demand manual migration) was considered and rejected as too disruptive
   for v1.
5. **Sync trigger**: automatic on every app boot (`OnApplicationBootstrap`, same hook
   `SeedDefaultDataService` already uses) — safe because reconciliation is non-destructive per
   decision 4.
6. **`draftToPublish`** (new — not in the reference, where draft/publish is always on): a
   root-level JSON boolean. `true` = two-row draft/publish workflow (Mode A, reference parity).
   `false` = single live row, Save==Publish in one step, status short-circuits to `"published"`,
   standalone publish/unpublish return `400` (Mode B). Table shape is identical in both modes —
   only service-layer branching (`draft-publish.policy.ts`) differs. Both seeds use `true`.
7. **Multi-table write atomicity**: wrapped in `prisma.$transaction` (this Plan phase's decision,
   context above) rather than left non-transactional.
8. **Permission slugs**: `content_type:read` (content-type structure is read-only via API —
   preserved exactly from the reference's own boundary, no create/edit/delete route for schema
   ever); `document:read`, `document:create`, `document:update`, `document:delete`,
   `document:publish`, `document:unpublish`. `super_admin` gets all 7 (no single `document:manager`
   slug exists, so super_admin is granted every write+read slug individually, consistent with how
   it already gets every other module's full slug set); `admin` gets the two `:read` slugs
   (`content_type:read`, `document:read`).
9. **Route prefix**: this repo's own `/api/<resource>` convention, not the reference's
   `/api/document-manager/...` — `/api/content-types`, `/api/documents/single-type/:slug`,
   `/api/documents/collection-type/:slug`, `/api/public/documents/...`.
10. **DDL-port placement**: `ISchemaTableRepository` (table create/alter/drop lifecycle) lives
    entirely inside `content-type`, not on `IDocumentRepository` — keeps `document → content-type`
    strictly one-way (SPEC §8.3).
11. **Open JSON body validation**: no existing DTO precedent in this repo for
    `Record<string, unknown>` bodies (every DTO here is flat and fully-typed). Thin `@IsObject()`
    DTOs gate shape at the controller; real per-field validation happens in the application layer
    against the resolved `ContentType.fields` schema.
12. **Field-type → column mapping** deliberately deviates from the reference in 3 places:
    `number → DOUBLE PRECISION` (not `REAL`, precision), `media → UUID REFERENCES
    media_assets(document_id) ON DELETE SET NULL` (real FK — `media_assets` is Prisma-managed here,
    unlike the reference), `json → JSONB` (not `TEXT` — queryable/indexable).
13. **Nested component tables** extend the reference (which only documented single-level component
    tables) to handle the seeds' real 3-level nesting: `components_<slug>__<path_underscored>`,
    linked via `parent_component_id` (no hard FK — enforced in code, not SQL, since parent/child
    live in separately-created dynamic tables), with deterministic hash-truncation if a derived
    name would exceed Postgres's 63-byte identifier limit.

## Tasks

### Phase 0 — Prisma model + migration + dir scaffold

- [ ] `prisma/postgresql/schema.prisma` — add `ContentType` model verbatim from SPEC §5.1
      (`content_types` table: `documentId @id @default(uuid())`, `slug @unique`, `name`, `kind`,
      `draftToPublish Boolean @map("draft_to_publish")`, `fields Json`,
      `listFields Json @map("list_fields")`, timestamps). Do **not** touch `prisma/mysql`/
      `prisma/sqlite`.
- [ ] `bun run prisma:migrate` — name it `add_content_types`; writes
      `prisma/postgresql/migrations/<timestamp>_add_content_types/`. **Needs a reachable
      Postgres** — if unreachable, flag as a blocked user action (non-blocking for Phases 1–2's
      pure work, same posture as the media cycle's Phase 0).
- [ ] `bun run prisma:generate` — `ContentType` present in `src/prisma/application/client/`
      (generate only reads the schema file, no DB connection needed).
- [ ] **Checkpoint 0:** `bun run build` succeeds with `ContentType` in the generated client.

### Phase 1 — SQL foundations (pure, no DB, highest-risk-first)

- [ ] `content-type/domain/entities/field-definition.ts` — `ContentKind`, `FieldType`, recursive
      `FieldDefinition`, `isComponentField` type guard (SPEC §4.1 verbatim).
- [ ] `content-type/application/schema/sql-identifier.ts` + spec — `assertSafeSlug`
      (`^[a-z0-9]+(?:-[a-z0-9]+)*$`, len 1–53), `assertSafeFieldName`
      (`^[a-zA-Z][a-zA-Z0-9]*$`, len 1–53), `quoteIdent` (assert-then-double-quote, escape embedded
      `"`). Spec adversarially: `slug; DROP TABLE`, empty, over-length, leading-digit field name,
      hyphenated field name, unicode, embedded-quote round-trip. **This is the single choke-point
      every DDL/DML string must pass through — build and test it before anything else.**
- [ ] `content-type/application/schema/table-naming.ts` + spec — `documentTableName(slug)` →
      `documents_<slug_underscored>`; `componentTableName(slug, path[])` →
      `components_<slug>__<path_underscored>` with deterministic hash-truncation past 63 bytes
      (`components_<slug>__<truncated>_<hash8>`). Spec: both seeds' real paths (`experience_role`,
      `phonetic_syllablePart`) produce the expected names; a synthetic 80-char path truncates
      stably across two calls (same input → same output).
- [ ] `content-type/application/schema/field-type-mapping.ts` + spec — pure `columnTypeFor(field):
      string` per the mapping in Confirmed Decision 12. Spec asserts each `FieldType` mapping and
      that `component` yields no column.
- [ ] **Checkpoint 1:** `bun run test content-type/application/schema` and
      `bun run test field-definition` green; `bun run build` clean.

### Phase 2 — Content-type domain + loader/validator/differ (pure/fs, no DB)

- [ ] `content-type/domain/entities/content-type.entity.ts` — `ContentTypeEntity` (SPEC §4.1) +
      `ContentTypeDefinition`/`ContentTypeSummary` types.
- [ ] `content-type/domain/repositories/content-type.repository.ts` — `IContentTypeRepository` +
      `UpsertContentTypeData` + `CONTENT_TYPE_REPOSITORY` token + `ContentTypeNotFoundError` (SPEC
      §8.1/§11 verbatim).
- [ ] `content-type/domain/repositories/schema-table.repository.ts` — `ISchemaTableRepository` +
      `SCHEMA_TABLE_REPOSITORY` token + `ColumnDiffPlan`/`LiveColumn` types (SPEC §8.2).
- [ ] `content-type/application/schema/schema-validator.ts` + spec — pure: runs
      `assertSafeSlug`/`assertSafeFieldName` recursively over slug/field/component names;
      `listFields` references real fields; reserved-name checks against system columns
      (`id`/`document_id`/`version`/`created_at`/`updated_at`/`published_at`/`created_by`/
      `updated_by`/`published_by`); recursive component validation. Spec: both seeds' 3-level
      shapes validate cleanly; bad slug/field/component name → throw; `listFields` unknown
      reference → throw.
- [ ] `content-type/application/schema/schema-loader.service.ts` + spec — reads
      `CONTENT_TYPES_DIR` (`ConfigService.get("CONTENT_TYPES_DIR", { infer: true })` →
      `path.join(process.cwd(), dir)`), globs `*.json`, parses, applies the `listFields` default
      (first 3 field names when omitted), calls the validator. Spec: valid dir → correct
      `ContentTypeDefinition[]`; malformed JSON → throw; missing dir → decide behavior (empty list
      vs throw) and test it.
- [ ] `content-type/application/sync/schema-differ.ts` + spec — **pure**
      `(liveColumns: LiveColumn[], desiredFields: FieldDefinition[]) → ColumnDiffPlan`
      (`addColumns`/`dropColumns`/`retypeColumns`) plus component-table add/drop plans; never
      diffs/drops system columns. Spec (the data-loss guardrail): field added → `addColumns`;
      field removed → `dropColumns` (other columns untouched in the plan); type changed →
      `retypeColumns` with a safe cast, incompatible → flagged drop+add; component field
      added/removed → table create/drop plan; identical schema → empty plan (no spurious diffs).
- [ ] **Checkpoint 2:** `bun run test content-type` (excluding not-yet-written persistence) green;
      `bunx tsc --noEmit` clean.

### Phase 3 — Content-type persistence (first DB-touching code)

- [ ] `content-type/infrastructure/persistence/prisma-content-type.repository.ts` + spec —
      `IContentTypeRepository` over Prisma `content_types`, mirroring
      `prisma-media.repository.ts`'s `toEntity` mapper + P2025-catch-on-delete shape. `fields`/
      `listFields` Json columns cast to typed arrays in `toEntity`. `findAllSummaries` selects only
      `name`/`slug`/`kind`/`draftToPublish`. Spec mocks `PrismaService`.
- [ ] `content-type/infrastructure/persistence/prisma-schema-table.repository.ts` + spec —
      `ISchemaTableRepository` via `$executeRawUnsafe`/`$queryRawUnsafe`. **Every identifier goes
      through `quoteIdent`/`table-naming`; every value is parameterized; `information_schema.
      columns` introspection for `listDocumentColumns`/`listComponentColumns` uses bound params,
      never interpolation.** Emits: document-table DDL (SPEC §7.2), component-table DDL including
      `parent_component_id` + indexes (SPEC §7.3), `ADD`/`DROP`/`ALTER COLUMN`, `DROP TABLE`
      cascading through component tables first. Spec (mocked prisma): assert the exact generated
      SQL strings for create/alter/drop, assert every identifier is quoted, assert
      `information_schema` queries use bound parameters. **Tightest spec in this plan — this file
      carries the most injection risk and the least prior art in this codebase.**
- [ ] **Checkpoint 3:** `bun run test content-type/infrastructure` green; `bun run build` clean.

### Phase 4 — Content-type sync + services + controller + module (commit point)

- [ ] `content-type/application/sync/content-type-sync.service.ts` + spec — `implements
      OnApplicationBootstrap`; orchestrates load → for each definition, diff live-vs-desired via
      `schema-differ` → apply DDL via `ISchemaTableRepository` → upsert the `ContentType` row via
      `IContentTypeRepository`; handles deletions (slug in DB, no matching file → delete the row +
      drop tables, cascading component tables). Recurses into nested components. Spec (mocked
      ports): new file → create table + component tables + insert row; changed file → alter +
      update row; deleted file → delete row + drop tables; malformed definition → throw loudly (the
      app must not boot with an un-syncable definition).
- [ ] `content-type/application/services/list-content-type.service.ts` + spec — returns
      `ContentTypeSummary[]`.
- [ ] `content-type/application/services/get-content-type.service.ts` + spec — full entity by
      slug; `ContentTypeNotFoundError` → `NotFoundException`. **Exported for the document module.**
- [ ] `content-type/presentation/content-type.controller.ts` + spec — `@Controller(
      "/api/content-types")`, `GET /` + `GET /:slug`, per-route `@UseGuards(JwtAuthGuard,
      PermissionsGuard)` + `@RequirePermissions("content_type:read")`, slug validated (400 on
      invalid format). **Read-only — no write routes, ever** (Confirmed Decision 8/boundary).
- [ ] `content-type/content-type.module.ts` (+ module spec, mirroring `media.module.spec.ts`) —
      binds `{ provide: CONTENT_TYPE_REPOSITORY, useClass: PrismaContentTypeRepository }`,
      `{ provide: SCHEMA_TABLE_REPOSITORY, useClass: PrismaSchemaTableRepository }`, all services +
      the sync service; **exports `GetContentTypeService` + `CONTENT_TYPE_REPOSITORY`**.
- [ ] `src/app.module.ts` — insert `ContentTypeModule` into the imports array (before `SeedModule`,
      after `MediaModule`).
- [ ] **Checkpoint 4 (automated):** `bun run build`, `bunx tsc --noEmit`, `bunx eslint .`,
      `bun run test content-type` all green — **commit here**. Content-type sync creating real
      tables is only observable against real Postgres, proven at Phase 11 — unit level is fully
      green at this point regardless.

### Phase 5 — Document domain + SQL helpers + raw DML repos

- [ ] `document/domain/entities/document.entity.ts` — `DocumentEntity`, `DocumentVersion`,
      `DocumentStatus` (SPEC §4.2).
- [ ] `document/domain/entities/component.entity.ts` — `ComponentEntity` including
      `parentComponentId` + `children` (SPEC §4.3).
- [ ] `document/domain/repositories/document.repository.ts` — `IDocumentRepository` +
      `DOCUMENT_REPOSITORY` + `ListOptions` (SPEC §8.4, row-level DML only). Every mutating method
      (`upsert`, `deleteAllVersions`, `deleteVersion`) takes an optional trailing
      `tx?: Prisma.TransactionClient` parameter per Confirmed Decision 7.
- [ ] `document/domain/repositories/component.repository.ts` — `IComponentRepository` +
      `COMPONENT_REPOSITORY` (SPEC §8.5). Same `tx?` parameter on `upsertAll`/`deleteByDocument`.
- [ ] `document/infrastructure/persistence/sql/row-mapper.ts` + spec — raw row ⇆ typed field map
      using `FieldDefinition` + `field-type-mapping`; handles `JSONB`, `media` UUID,
      `DOUBLE PRECISION`, `BOOLEAN`. Pure.
- [ ] `document/infrastructure/persistence/sql/where-builder.ts` + spec — builds the `ILIKE` search
      clause (escaping `%`/`_`/`\` with `ESCAPE '\'`, OR'd across searchable `text`/`richtext`
      `listFields`) + `ORDER BY` clause from the schema allowlist (system fields plus any
      `text`/`number`/`boolean` content field); re-validates `orderBy`/`search` column names against
      the allowlist immediately before interpolation as defence-in-depth; invalid → throw (→ 400 at
      the controller). Pure.
- [ ] `document/infrastructure/persistence/prisma-document.repository.ts` + spec — raw
      parameterized SQL over `documents_<slug>` implementing every `IDocumentRepository` method;
      `findManyByVersion` batches for no-N+1 status computation; `listPaginated` uses
      `where-builder`; every mutating method executes via `(tx ?? this.prisma)`. Spec mocks prisma,
      asserts SQL text + parameter bindings, and asserts the `tx` client is used when supplied.
- [ ] `document/infrastructure/persistence/prisma-component.repository.ts` + spec — raw SQL over
      `components_<slug>__<path>` (SPEC §8.5); ordering by autoincrement `id`; same `tx ??
      this.prisma` pattern. Spec mocks prisma.
- [ ] **Checkpoint 5:** `bun run test document/infrastructure` green; `bun run build` clean.

### Phase 6 — Document support layer

- [ ] `document/application/support/schema-resolver.service.ts` + spec — resolves `:slug →
      ContentTypeEntity` via the injected `GetContentTypeService`; unknown slug → 404. The one
      place the `document → content-type` module edge is actually exercised at runtime.
- [ ] `document/application/support/draft-publish.policy.ts` + spec — pure; centralizes every
      mode-specific branch on `contentType.draftToPublish` (Confirmed Decision 6): which version
      Save writes to, whether publish/unpublish is allowed.
- [ ] `document/application/support/status-resolver.ts` + spec — pure; `draftToPublish === false`
      → `"published"` short-circuit (no timestamp comparison); else draft/modified/published by
      comparing `draft.updatedAt` vs `published.updatedAt`; a **batch variant** for list responses
      (fetch all published rows for the page's documentIds in one query, compute in memory — no
      N+1, a hard boundary carried from the reference).
- [ ] `document/application/support/component-io.service.ts` + spec — recursive extract-on-save /
      hydrate-on-read / cascade-delete across nested component tables; threads the optional `tx`
      client through to `IComponentRepository` calls; maintains `parentComponentId` linkage and
      insertion order. Spec covers the full 3-level shapes from both real seeds (`cv-page`:
      `experiences → roles`; `en-it-vocab`: `phonetics → syllableParts`), order preservation, and
      cascade-on-delete. **Highest data-integrity risk in the document module.**
- [ ] `document/application/support/list-query.parser.ts` + spec — pure; parses/validates
      `start`/`size` (≤100, else 400)/`orderBy`/`sortDir`/`search` against the resolved content
      type's schema, producing `ListOptions`.
- [ ] **Checkpoint 6:** `bun run test document/application/support` green; `bunx tsc --noEmit`
      clean.

### Phase 7 — Document collection services

- [ ] `save-document.service.ts` + spec — create-or-update. Mode A: upserts the draft row inside a
      `prisma.$transaction`, delegating component subtrees to `component-io` with the `tx` client.
      Mode B: upserts the single live row (sets `publishedAt`/`publishedBy` too), same transaction
      wrapping. Generates a UUID v4 `documentId` when absent.
- [ ] `publish-document.service.ts` + spec — Mode A: copies draft → published (document row +
      components) inside a transaction. **Mode B: throws `BadRequestException` via
      `draft-publish.policy`, no repo call.**
- [ ] `unpublish-document.service.ts` + spec — Mode A: deletes the published row + its components
      inside a transaction. **Mode B: 400.**
- [ ] `get-document-for-edit.service.ts` + spec — returns draft (A) / live (B) + computed status.
- [ ] `get-public-document.service.ts` + spec — published row only; 404 if none; never leaks draft
      data.
- [ ] `delete-document.service.ts` + spec — deletes all versions + cascades all component rows,
      inside a transaction.
- [ ] `list-documents.service.ts` + spec — paginated, projected to `listFields`, batch status
      (no N+1), `total`, search/sort via `where-builder`/`list-query.parser`.
- [ ] `duplicate-document.service.ts` + spec — copies the source draft (A) / live (B) into a fresh
      `documentId`; media refs shared (same UUIDs, no re-upload).
- [ ] **Checkpoint 7:** `bun run test document/application/services` (collection subset) green.

### Phase 8 — Bulk + single-type services

- [ ] `bulk-create-publish.service.ts` + spec — ≤100 items (400 if 0 or >100). Sequential
      Save→Publish (Mode A) / Save (Mode B) per item. **All-or-nothing via compensating `Delete`**
      on the first failure — not a DB transaction across items (each item's own Save/Publish is
      still internally transactional per Phase 7, but the batch-level rollback stays the
      reference's compensating-delete approach, since a single cross-item DB transaction would
      hold a lot of locks across up to 100 create+publish cycles). Spec: all-valid ordering;
      mid-batch Save failure rolls back all prior items; a Publish failure rolls back the current
      item too, not just prior ones.
- [ ] `bulk-delete.service.ts` + spec — ≤100 IDs. Loops the existing `Delete` service independently
      per ID; **partial success, no rollback**; returns `[{ documentId, error? }]`. Spec: all
      succeed; one fails and the rest still process; all fail; empty slice returns empty results
      without panicking.
- [ ] `get-single-type.service.ts` + spec — draft/live + status; 404 if none exists.
- [ ] `save-single-type.service.ts` + spec — create-or-update the singleton (no `:documentId`),
      same transaction wrapping as `save-document.service.ts`.
- [ ] `publish-single-type.service.ts` + spec — Mode A only; **Mode B: 400.**
- [ ] `unpublish-single-type.service.ts` + spec — Mode A only; **Mode B: 400.**
- [ ] **Checkpoint 8:** `bun run test document/application/services` (full) green; `bun run build`
      clean.

### Phase 9 — Document presentation + DTOs + module wiring

- [ ] `document/presentation/dto/save-document.dto.ts` — `{ data: Record<string, unknown> }`,
      `@IsObject()` on `data` (shape-gate only; real validation is in the application layer per
      Confirmed Decision 11).
- [ ] `bulk-create.dto.ts` — `{ items: { data: Record<string,unknown> }[] }`, `@ArrayMinSize(1)`
      `@ArrayMaxSize(100)`.
- [ ] `bulk-delete.dto.ts` — `{ documentIds: string[] }`, `@ArrayMinSize(1)` `@ArrayMaxSize(100)`.
- [ ] `list-query.dto.ts` — `start`/`size`/`orderBy`/`sortDir`/`search` query params.
- [ ] `single-type-document.controller.ts` + spec — `@Controller("/api/documents/single-type")`;
      GET/PUT/publish/unpublish; per-route guards + permissions per SPEC §10.2; slug 400 on
      invalid.
- [ ] `collection-type-document.controller.ts` + spec — `@Controller(
      "/api/documents/collection-type")`; **the two `/bulk` routes declared before `/:documentId`
      routes** (or Nest captures `"bulk"` as a `documentId` — SPEC §10.3's documented footgun);
      list/get/create/update/delete/publish/unpublish/duplicate/bulk; bulk-create requires
      `document:create` **and** `document:publish` (chained guards); slug + documentId (UUID v4)
      400 on invalid.
- [ ] `public-document.controller.ts` + spec — `@Controller("/api/public/documents")`; **no
      guards**; `GET collection-type/:slug/:documentId` + `GET single-type/:slug`; published data
      only.
- [ ] `document/document.module.ts` — `imports: [ContentTypeModule]`; binds
      `DOCUMENT_REPOSITORY`/`COMPONENT_REPOSITORY`; wires every service + all three controllers.
- [ ] `src/app.module.ts` — add `DocumentModule` (after `ContentTypeModule`, before `SeedModule`).
- [ ] **Checkpoint 9:** `bun run build`, `bunx tsc --noEmit`, `bunx eslint .`,
      `bun run test document` all green.

### Phase 10 — Seed permissions + seed JSON (commit point)

- [ ] `src/bootstrap/seed-default-data.service.ts` — append 7 slugs to `DEFAULT_PERMISSIONS`:
      `content_type:read`, `document:read`, `document:create`, `document:update`,
      `document:delete`, `document:publish`, `document:unpublish`. Grant all 7 to
      `super_admin.permissions`; grant `content_type:read` + `document:read` to
      `admin.permissions` (Confirmed Decision 8). Additive, `findBySlug`-guarded — same pattern as
      every prior module's addition.
- [ ] `src/bootstrap/seed-default-data.service.spec.ts` — update
      `expect(permissions.create).toHaveBeenCalledTimes(N)` (10 → 17), the ordered `createdSlugs`
      array (append the 7 in declaration order), the partial-seed count (9 → 16), and the
      `superAdminCall.permissions`/`adminCall.permissions` `toEqual` arrays and their test
      descriptions (mirroring how `media:manager`/`media:read` were added last cycle).
- [ ] `content-types/cv-page.json` — adopt `covert/content-type/cv-page.json` verbatim plus
      `"draftToPublish": true` at the root. No `listFields` override needed (defaults to first 3:
      `position`, `isMain`, `company`).
- [ ] `content-types/en-it-vocab.json` — adopt `covert/content-type/en-it-vocab.json` verbatim plus
      `"draftToPublish": true`. Defaults `listFields` to `wordGroup`, `word`, `partsOfSpeech`.
- [ ] **Checkpoint 10 (automated):** `bun run build`, `bunx tsc --noEmit`, `bunx eslint .`,
      `bun run test:cov` all green — **commit here**. This is the full feature at unit level;
      Phase 11's DB-dependent work doesn't block this commit (same rule as the media cycle).

### Phase 11 — e2e (real Postgres, manual/flagged if unreachable)

- [ ] `test/content-engine.e2e-spec.ts` — reuse `bootTestApp`; create `User` rows directly via
      `PrismaService`, sign JWTs via `JwtTokenService.signAccessToken({ sub, roleSlug, level,
      permissions })`, send as `Cookie: access_token=...`; `runId` suffix for isolation; delete
      created rows **and drop the seeded dynamic tables** in `afterAll`. Scenarios (SPEC §13/§14):
      boot sync materializes `documents_cv_page`/`documents_en_it_vocab` + their nested component
      tables; full create→publish→public-read path (Mode A, both seeds are Mode A); publish on
      a hypothetical Mode-B type → 400 (can use a throwaway third content-type JSON just for this
      test, or a unit-level proof if a real Mode-B e2e fixture is too heavy — decide at
      implementation time); 401 unauthenticated; 403 under-permissioned; bulk create+publish +
      bulk delete happy/partial paths; 3-level component round-trip with order preserved; schema
      edit (add/remove a field on a throwaway content type) + reboot-equivalent re-sync call
      preserves other fields' data.
- [ ] **Checkpoint 11 (manual, needs reachable Postgres):** `bun run test:e2e` green. As with the
      media cycle, a pre-existing dev DB may have `super_admin`/`admin` roles predating the 7 new
      slugs — grant via real `PUT /api/roles/:id` calls if so (expected, not a defect). The commit
      is already taken at Checkpoint 10 — don't hold it open waiting on this.

### Phase 12 — Docs

- [ ] `docs/documents/content-type.md` — mirror `docs/documents/media.md`'s structure for the
      content-type module.
- [ ] `docs/documents/document.md` — same, for the document module (entity, repos, services,
      draft/publish modes, API contracts, boundaries, known gaps).
- [ ] `docs/ENTRYPOINT.md` — add the two new index lines.
- [ ] `SPEC.md` — trim to a pointer line, per the "Root docs" rule.
- [ ] **Checkpoint 12:** doc read-through — commit.

## Verification (end-to-end)

1. `bun run build && bunx tsc --noEmit && bunx eslint . && bun run test:cov` — all green through
   Phase 10, no DB required.
2. `bun run test:e2e` — `content-engine.e2e-spec.ts` green against real Postgres: sync creates real
   tables on boot, Mode-A draft/publish lifecycle, bulk semantics, 3-level component round-trip,
   diff-based schema reconciliation preserves data.
3. No test performs a real external network call (this feature has no external service dependency,
   unlike media/storage).
4. Manual (Phase 11, user-performed if no e2e Postgres is available in this environment): confirm
   the e2e suite against the user's own reachable Postgres, same pattern as the media cycle's
   Checkpoint 5.
