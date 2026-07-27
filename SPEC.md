# SPEC — Content-Type-Schema-Driven CMS Document Engine

> **Status:** Spec (pre-Plan). Feature tagged `[CAREFUL]` — Opus for Spec / Build-plan / Review phases (`docs/rules/workflow.md`).
> **Scope:** two new top-level modules — `src/modules/content-type/` and `src/modules/document/`.
> **Stack target:** NestJS 11 + Prisma 7 + Bun + PostgreSQL. This is a *stack adaptation* of a prior Go/GORM/MongoDB CMS design (the `covert/**` reference), **not** a verbatim port.

---

## 1. Objective

Today, adding a new kind of content to this CMS means writing a new NestJS module by hand: a Prisma model, a migration, a repository, services, a controller, permission slugs. That is fine for the fixed platform resources (`users`, `roles`, `permissions`, `media`, …) but does not scale to *content modelling* — the CV page, a vocabulary dictionary, a blog, etc. — where the shape of the data is a product concern that changes often and should not require a code deploy + migration each time.

This feature introduces **schema-as-code content modelling**. A developer declares a content type as a JSON file (`content-types/*.json`); on every app boot a sync engine reconciles those declarations against PostgreSQL, creating/altering a dedicated table per content type. A single generic **Document engine** then serves full CRUD + draft/publish + list/search/sort/pagination + bulk operations over *any* declared content type, dispatching purely on the URL `:slug` and the content type's schema — no per-content-type backend code.

**Who benefits**
- **Content/product engineers** add or reshape a content type by editing one JSON file; the table and the entire REST surface appear on next boot.
- **API consumers / a future admin UI** get a uniform, predictable REST contract across every content type (single-type and collection-type alike).
- **The platform** keeps content data in real, typed, queryable Postgres columns (not opaque JSON blobs), so ordinary SQL tooling, indexes, and FKs still apply.

**Two real seed content types ship with the feature** (adopted from the reference): `cv-page` (a CV/résumé page) and `en-it-vocab` (an English↔Italian/Vietnamese IT vocabulary dictionary). Both are `kind: "collection"` and both use nested, repeatable **component** fields (up to three levels deep).

---

## 2. Tech Stack

| Concern | Choice | Notes |
|---|---|---|
| Framework | NestJS 11 | Same as the rest of the repo; clean-architecture modules under `src/modules/*`. |
| ORM (platform models) | Prisma 7 (`@prisma/adapter-pg`) | `ContentType` is a **Prisma-managed** model (the schema registry lives in a normal migrated table). |
| Dynamic content tables | **Raw SQL via Prisma** (`prisma.$executeRawUnsafe` / `$queryRawUnsafe` + `Prisma.sql` tagged templates for values) | The per-content-type `documents_*` / `components_*` tables are **not** Prisma models — they are created/altered/dropped at runtime by the sync engine's DDL, and read/written by raw parameterised SQL. |
| Runtime | Bun | `bun run build` / `bun run test` / `bun run test:cov` / `bun run test:e2e`. |
| DB | PostgreSQL only | `prisma/mysql/schema.prisma` and `prisma/sqlite/schema.prisma` stay empty stubs — see [§12 Boundaries](#12-boundaries). `DB_DRIVER` defaults to `postgresql` (`PrismaService`). |
| Auth | `JwtAuthGuard` + `PermissionsGuard` + `@RequirePermissions(...)`, per-route | Same guards used by `media`/`roles`/`permissions`. Guards read permissions off the JWT payload; no live DB lookup. |
| Tests | Jest, `.spec.ts` co-located with each source file; e2e under `test/*.e2e-spec.ts` | Reuse `test/utils/app-test.util.ts` (`bootTestApp`) from the `media` cycle. |

### 2.1 Raw-SQL rules (mandatory)

Because table and column names for the dynamic tables come from developer-authored JSON — **not** end-user HTTP input — they cannot be passed as SQL bind parameters (identifiers are never parameterisable). They **must** be string-interpolated into DDL/DML. To keep that safe, the sync engine and the raw repositories obey these rules without exception:

1. **Values are always parameterised.** Every content-field *value* and every system-field value on read/write goes through Prisma's tagged-template parameter binding (`` Prisma.sql`... ${value} ...` ``) or `$queryRawUnsafe(sql, ...params)` positional params — never string-concatenated.
2. **Identifiers are validated then quoted.** Any table name, column name, or component name that must be interpolated passes through a single choke-point helper before it touches a SQL string:
   - `assertSafeSlug(slug)` — regex `^[a-z0-9]+(?:-[a-z0-9]+)*$`, length 1–53 (see identifier-length note below). Matches the reference slug rule.
   - `assertSafeFieldName(name)` — regex `^[a-zA-Z][a-zA-Z0-9]*$`, length 1–53. Content-type JSON field names are camelCase (`wordGroup`, `isMain`, `techStack`), so the field-name regex **allows mixed case** and no separators. (This is a new regex this feature defines; the reference only specified the slug regex.)
   - `quoteIdent(name)` — asserts the name is safe, then wraps it in double quotes (`"wordGroup"`) and doubly escapes any embedded `"` as defence-in-depth. **All** identifiers in generated SQL are double-quoted so PostgreSQL preserves camelCase (unquoted identifiers fold to lowercase).
   These checks run **inside the sync engine itself**, on every identifier, on every boot — the JSON is trusted-ish but still treated as an injection surface.
3. **Table-name derivation** — `documents_<slug_underscored>`, where `<slug_underscored>` replaces `-` with `_` (`cv-page` → `documents_cv_page`). Component tables: see [§7.3](#73-component-tables-nested).
4. **PostgreSQL 63-byte identifier limit.** Slugs are capped at 53 chars so `documents_` (10) + slug fits; nested component table names can still overflow (see [§7.3](#73-component-tables-nested)) — the deterministic-truncation rule there handles it. This is why the slug cap is 53, not the reference's 63.

---

## 3. Project Structure

Two independent modules, each in this repo's `domain / application / infrastructure / presentation` layer convention (mirrors `src/modules/media`). Every source file ≤ 500 lines (`docs/rules/workflow.md`); use-cases are one-service-per-operation (not one fat service). Every source file has a co-located `.spec.ts` (omitted from the map below for brevity except where noteworthy).

### 3.1 `src/modules/content-type/`

```
content-type/
  domain/
    entities/
      content-type.entity.ts          # ContentTypeEntity (documentId, slug, name, kind, draftToPublish, fields, listFields, timestamps)
      field-definition.ts             # FieldDefinition (recursive), FieldType, ContentKind types + type guards (isComponentField)
    repositories/
      content-type.repository.ts      # IContentTypeRepository + CONTENT_TYPE_REPOSITORY token; ContentTypeNotFoundError
      schema-table.repository.ts      # ISchemaTableRepository + SCHEMA_TABLE_REPOSITORY token (DDL lifecycle port — see §8.3)
  application/
    schema/
      schema-loader.service.ts        # reads content-types/*.json → ContentTypeDefinition[]; parse + structural validation
      schema-validator.ts             # pure: identifier regexes, listFields-references-real-field, component recursion, reserved-name checks
      field-type-mapping.ts           # pure: FieldType → Postgres column-type SQL fragment (single source of truth, shared w/ document module)
    sync/
      content-type-sync.service.ts    # OnApplicationBootstrap orchestrator: load → diff → DDL → upsert CT rows → handle deletions
      schema-differ.ts                # pure: (live columns, desired fields) → { addColumns, dropColumns, retypeColumns } + table/component add/drop plans
    services/
      list-content-type.service.ts    # ListSummary: name/slug/kind/draftToPublish only
      get-content-type.service.ts     # FindBySlug (full ContentTypeEntity) — 404 if unknown
  infrastructure/
    persistence/
      prisma-content-type.repository.ts    # IContentTypeRepository over the Prisma-managed content_types table
      prisma-schema-table.repository.ts     # ISchemaTableRepository — raw DDL for documents_*/components_* + information_schema column introspection
  presentation/
    content-type.controller.ts        # @Controller("/api/content-types") — GET list, GET :slug (READ-ONLY, no write routes)
  content-type.module.ts              # wires everything; exports CONTENT_TYPE_REPOSITORY + GetContentTypeService + field-type-mapping for the document module
```

### 3.2 `src/modules/document/`

```
document/
  domain/
    entities/
      document.entity.ts              # DocumentEntity (documentId, version, fields, timestamps, *By), DocumentVersion, DocumentStatus
      component.entity.ts             # ComponentEntity (componentId, documentId, version, parentComponentId, fields, children)
    repositories/
      document.repository.ts          # IDocumentRepository (row-level DML only) + DOCUMENT_REPOSITORY token
      component.repository.ts         # IComponentRepository (row-level DML only) + COMPONENT_REPOSITORY token
  application/
    support/
      schema-resolver.service.ts      # resolves :slug → ContentTypeEntity via GetContentTypeService; 404 on unknown slug
      draft-publish.policy.ts         # pure: branches all mode-specific behaviour on contentType.draftToPublish (§5.4)
      status-resolver.ts              # pure: (draft, published, draftToPublish) → DocumentStatus; batch variant for lists (no N+1)
      component-io.service.ts         # extract components from a data map on save; hydrate components into a data map on read (recursive)
      list-query.parser.ts            # pure: parse/validate start,size,orderBy,sortDir,search against the content type's schema
    services/
      # collection-type
      save-document.service.ts        # Save (create-or-update draft row); backs POST create + PUT update
      publish-document.service.ts     # Publish (copy draft → published)
      unpublish-document.service.ts   # Unpublish (delete published)
      get-document-for-edit.service.ts# GetForEdit (draft + computed status)
      get-public-document.service.ts  # GetPublic (published only; 404 if none)
      delete-document.service.ts      # Delete (draft + published + cascade components)
      list-documents.service.ts       # GetAllPaginated (projected listFields, batch status, total, search/sort)
      duplicate-document.service.ts   # Duplicate (fresh documentId, media refs shared)
      bulk-create-publish.service.ts  # BulkCreateAndPublish (≤100, all-or-nothing via compensating delete)
      bulk-delete.service.ts          # BulkDelete (≤100, partial-success, no rollback)
      # single-type
      get-single-type.service.ts      # GetSingleType (draft/live + status; 404 if none)
      save-single-type.service.ts     # SaveSingleType (create-or-update the singleton)
      publish-single-type.service.ts  # PublishSingleType
      unpublish-single-type.service.ts# UnpublishSingleType
  infrastructure/
    persistence/
      prisma-document.repository.ts   # IDocumentRepository — raw parameterised SQL over documents_<slug>
      prisma-component.repository.ts  # IComponentRepository — raw parameterised SQL over components_<slug>_<path>
      sql/
        row-mapper.ts                 # map a raw SQL row ⇆ typed field map using FieldDefinition + field-type-mapping
        where-builder.ts              # build safe ILIKE search filter + ORDER BY clause from the schema allowlist
  presentation/
    single-type-document.controller.ts    # @Controller("/api/documents/single-type") — GET/PUT/publish/unpublish
    collection-type-document.controller.ts # @Controller("/api/documents/collection-type") — list/get/create/update/delete/publish/unpublish/duplicate/bulk
    public-document.controller.ts          # @Controller("/api/public/documents") — unauthenticated published reads (single-type + collection-type)
    dto/
      save-document.dto.ts            # { data: Record<string, unknown> }
      bulk-create.dto.ts             # { items: { data: Record<string,unknown> }[] } — @ArrayMaxSize(100), @ArrayMinSize(1)
      bulk-delete.dto.ts             # { documentIds: string[] } — @ArrayMaxSize(100), @ArrayMinSize(1)
      list-query.dto.ts              # start/size/orderBy/sortDir/search query params
  document.module.ts                  # imports ContentTypeModule; wires services + binds DOCUMENT_REPOSITORY/COMPONENT_REPOSITORY
```

### 3.3 Repo-root additions

```
content-types/                         # schema-as-code definitions (NEW top-level dir; matches the reference's own convention)
  cv-page.json                         # adopted from covert/content-type/cv-page.json + "draftToPublish": true
  en-it-vocab.json                     # adopted from covert/content-type/en-it-vocab.json + "draftToPublish": true
prisma/postgresql/schema.prisma        # + ContentType model (see §5.1) + one migration
src/bootstrap/seed-default-data.service.ts  # + 7 permission slugs (§10) granted to super_admin/admin (additive, findBySlug-guarded)
```

> **No third `component` module.** Component storage is an internal persistence concern of the `document` module (`component-io.service.ts` + `prisma-component.repository.ts`). Components have no independent domain identity, service, controller, or route — matching decision #9.

---

## 4. Entities

TypeScript shapes, adapted from `covert/doc/document/entities.md` and `covert/doc/content-type.md §3`, **with `locale` dropped everywhere** (v1 out-of-scope) and this repo's `documentId`/plain-`id` PK convention applied.

### 4.1 Content-type domain types

```ts
// field-definition.ts
export type ContentKind = "single" | "collection";

export type FieldType =
  | "text" | "richtext" | "number" | "boolean" | "media" | "json" | "component";

export interface FieldDefinition {
  name: string;              // camelCase; assertSafeFieldName
  type: FieldType;
  width?: string;            // UI hint only ("50%"), ignored by the engine
  header?: boolean;          // UI hint only, ignored by the engine
  // component-only (present iff type === "component"):
  component?: string;        // component's declared name (assertSafeFieldName); table-name segment
  repeatable?: boolean;      // true → array of component rows; false/absent → single component row
  fields?: FieldDefinition[];// recursive sub-schema (may itself contain components — up to 3 levels in the seeds)
}

export function isComponentField(f: FieldDefinition): boolean {
  return f.type === "component";
}
```

```ts
// content-type.entity.ts
export class ContentTypeEntity {
  constructor(
    public readonly documentId: string,     // UUID PK (Prisma @id @default(uuid()))
    public readonly slug: string,            // unique, ^[a-z0-9]+(?:-[a-z0-9]+)*$
    public readonly name: string,
    public readonly kind: ContentKind,
    public readonly draftToPublish: boolean, // NEW toggle — see §5.4
    public readonly fields: FieldDefinition[],
    public readonly listFields: string[],    // projection for collection lists (defaults to first 3 field names)
    public readonly createdAt: Date,
    public readonly updatedAt: Date,
  ) {}
}
```

`ContentTypeDefinition` (loader output, before it becomes an entity) is the parsed JSON shape: `{ slug, name, kind, draftToPublish, fields, listFields? }`.

### 4.2 Document domain types

```ts
// document.entity.ts
export type DocumentVersion = "draft" | "published";
export type DocumentStatus  = "draft" | "modified" | "published";

export class DocumentEntity {
  constructor(
    public readonly documentId: string,                 // UUID v4 — the business key
    public readonly version: DocumentVersion,           // which row this is
    public readonly fields: Record<string, unknown>,    // content fields, keyed by FieldDefinition.name (components nested)
    public readonly createdAt: Date,
    public readonly updatedAt: Date,
    public readonly publishedAt: Date | null,
    public readonly createdBy: string | null,           // User.documentId (or null — no caller-identity wiring is a known repo gap)
    public readonly updatedBy: string | null,
    public readonly publishedBy: string | null,
  ) {}
}
```

`status` is **computed, never stored** (see [§6.3](#63-status-computation)).

### 4.3 Component domain type

```ts
// component.entity.ts
export class ComponentEntity {
  constructor(
    public readonly componentId: string,               // UUID per component row
    public readonly documentId: string,                // owning document
    public readonly version: DocumentVersion,
    public readonly parentComponentId: string | null,  // null for root-level; set for nested (NEW — extends the reference, §7.3)
    public readonly fields: Record<string, unknown>,   // this component's scalar fields
    public readonly children: Record<string, ComponentEntity[]>, // nested component fields, keyed by field name
  ) {}
}
```

---

## 5. Domain Rules

### 5.1 Content-type schema-as-code

- **Source of truth is `content-types/*.json`** — never the API/UI. There is no create/edit/delete route for content-type *structure* (only read). This boundary is preserved exactly from the reference.
- **`ContentType` is a Prisma-managed registry row** (new model, migrated) — it stores the parsed schema for fast lookup at request time. The `content_types` table is the *only* new Prisma model; the `documents_*`/`components_*` tables are raw-SQL-managed.

  ```prisma
  model ContentType {
    id             Int      @default(autoincrement())
    documentId     String   @id @unique @default(uuid()) @map("document_id")
    slug           String   @unique
    name           String
    kind           String                         // "single" | "collection"
    draftToPublish Boolean  @map("draft_to_publish")
    fields         Json                            // FieldDefinition[]
    listFields     Json     @map("list_fields")    // string[]
    createdAt      DateTime @default(now()) @map("created_at")
    updatedAt      DateTime @updatedAt @map("updated_at")
    @@map("content_types")
  }
  ```
- **System fields are injected automatically**, never declared in JSON: `createdAt`, `updatedAt`, `publishedAt`, `createdBy`, `updatedBy`, `publishedBy`, plus the internal `id`/`document_id`/`version`. (The reference's `locale` system field is **dropped** for v1.)
- **`assertSafeFieldName`/`assertSafeSlug` run on load.** A malformed slug, field name, or component name fails the boot sync loudly (the app must not start with an un-syncable definition).

### 5.2 Content-type kinds

- **`single`** — at most one entry. No singleton is auto-created; the first explicit Save materialises it. Routes: get + save + (publish/unpublish, if `draftToPublish`). **No create, no delete, no `:documentId` in the URL.**
- **`collection`** — zero-or-more entries, each with its own `documentId`. Full list/create/update/delete + per-entry publish/unpublish + duplicate + bulk.
- Both kinds support both `draftToPublish` values.

### 5.3 `listFields` projection

- Optional `listFields: string[]` in the JSON. If omitted, defaults to the **first 3** field names from `fields`.
- Only meaningful for `kind: "collection"` (single-type has no list).
- Every entry must reference a real field name — validated by `schema-validator.ts` at boot (invalid → sync fails).
- Collection **list** responses (`GET .../collection-type/:slug`) return `data` containing **only** the projected `listFields`. Full field data is only ever returned by a single-document GET.

### 5.4 `draftToPublish` semantics (the core new behaviour)

`draftToPublish` is a **root-level boolean** in each content-type JSON. It is **not** in the reference (there draft/publish is always on). It selects between two modes; the table shape is **identical** in both (so the sync engine and diff stay uniform) — the difference is entirely in the service/business layer.

#### Mode A — `draftToPublish: true` (reference-parity, always-on draft/publish)
- Every entry is **two rows** in `documents_<slug>`: `version = 'draft'` and `version = 'published'`.
- **Documents are only created on explicit Save.** No row exists until the user saves.
- **Save** upserts the **draft** row's fields, `updatedAt`, `updatedBy`. It **never** touches the published row.
- **Publish** copies the draft row's fields → published row (upsert), sets `publishedAt = now()`, `publishedBy = user`. Components are copied draft→published too.
- **Unpublish** deletes the published row (draft survives).
- **Status** is computed (§6.3): `draft` / `modified` / `published`.
- **Public read** resolves the **published** row only; 404 if none.
- **Publish/unpublish endpoints active.**

#### Mode B — `draftToPublish: false` (no draft ever; Save == Save+Publish)
- Each entry is **exactly one row**, always written with **`version = 'published'`** (the `version` column keeps its value so the `UNIQUE(document_id, version)` constraint and the shared table shape are unchanged — the column simply never takes `'draft'` for this content type).
- **Save writes directly to that single live/public row.** On save, `publishedAt` and `updatedAt` are both set to `now()`, `publishedBy` = `updatedBy` = user. There is no separate publish step.
- **Status short-circuits to `published`** for every entry — `status-resolver.ts` returns `"published"` immediately when `contentType.draftToPublish === false`, without any timestamp comparison, and never returns `"draft"`/`"modified"`.
- **Public read** returns that single row (it *is* the published row); 404 if none.
- **`publish` / `unpublish` endpoints are routable but rejected.** NestJS routes are static over `:slug`, so the routes always exist; `PublishDocumentService`/`UnpublishDocumentService` (and their single-type twins) check the resolved content type and throw **`400 BadRequestException`** ("Content type '<slug>' does not use draft/publish; changes are live on save") before any repository call. This is the only mode-specific rejection.
- **Bulk create+publish is *allowed*** on a `draftToPublish: false` collection and behaves as bulk-create — the "publish" half is implicit because Save already writes the live row. (Deliberate: the endpoint means "create these and make them live", which is exactly Save in mode B. Only the *standalone* publish/unpublish endpoints reject.)

#### Interaction with kind
| | `draftToPublish: true` | `draftToPublish: false` |
|---|---|---|
| **single** | singleton has draft+published rows; get returns draft+status; publish/unpublish active | singleton is one live row; get returns it as `published`; publish/unpublish → 400 |
| **collection** | each entry draft+published; full workflow | each entry one live row; create/update write live; publish/unpublish → 400; bulk-create-publish == bulk-create |

### 5.5 Component field storage rules
- A `type: "component"` field is stored in a **separate table**, never as a column in the document table (see [§7](#7-fieldtype--sql-mapping--table-strategy)).
- `repeatable: true` → zero-or-more component rows per (document, version); ordering preserved by the component table's autoincrement `id` (insertion order — matches the reference dropping its explicit `Order` column).
- `repeatable: false`/absent → at most one component row.
- Components are **version-scoped**: draft components and published components are distinct rows (`version` column), copied draft→published on Publish (mode A).
- Nested components (component-within-component) link to their parent via `parent_component_id` (§7.3).
- On **read**, `component-io.service.ts` recursively hydrates component rows back into the document's `fields` map under the field name. On **save**, it recursively extracts component sub-trees out of the incoming `data` map, writes scalars to the document row and component sub-trees to their tables. On **delete/unpublish**, it cascades to all descendant component rows for the affected (document, version).

---

## 6. Sync Engine

### 6.1 Trigger & ordering
- `ContentTypeSyncService implements OnApplicationBootstrap` (same lifecycle hook the existing `SeedDefaultDataService` uses). It runs **once per boot, before any document read/write is possible** (HTTP starts serving after `onApplicationBootstrap` completes).
- Because reconciliation is non-destructive (§6.2), automatic-every-boot sync is safe.
- **Ordering vs. other startup:** sync depends on `SeedDefaultDataService` only insofar as both are bootstrap hooks; there is no data dependency between them. Sync must complete before the first request — guaranteed by the hook contract. (If a strict ordering is ever needed, both hooks live in modules imported by `AppModule`; Nest runs `onApplicationBootstrap` in provider-registration order — noted in Open Questions.)

### 6.2 Reconciliation (diff-based, data-preserving)
For each JSON definition vs. the DB state:

| Situation | Action |
|---|---|
| **New file** (slug not in `content_types`) | `INSERT` ContentType row; `CREATE TABLE documents_<slug>`; `CREATE TABLE` each component table (recursively). |
| **Changed file** (slug exists, schema differs) | `UPDATE` ContentType row; **`ALTER TABLE`** the document/component tables per the column diff — **never `DROP TABLE`+recreate**. |
| **Field added** | `ADD COLUMN` (nullable) — existing rows get `NULL`. |
| **Field removed** | `DROP COLUMN` — data for **all other** columns is untouched. |
| **Field type changed** | `ALTER COLUMN ... TYPE ... USING ...` where a safe cast exists; otherwise treated as drop-old + add-new-column (data for that one field is lost, everything else survives) — logged as a warning. See Open Questions on retype safety. |
| **Component field added/removed** | `CREATE`/`DROP` that component's table (and recursively its descendants). |
| **File deleted** (slug in DB, no JSON file) | `DELETE` ContentType row; `DROP TABLE` the document table **and** every component table (cascade), matching the reference's file-deletion rule. |

- **Column diffing** reads the live table shape from `information_schema.columns` and compares column name + type against the desired set derived from `fields` via `field-type-mapping.ts`. System columns (`id`, `document_id`, `version`, `created_at`, …) are never diffed/dropped.
- `schema-differ.ts` is a **pure function** ((liveColumns, desiredFields) → a plan) so it is unit-testable without a DB; `prisma-schema-table.repository.ts` executes the plan as DDL.

### 6.3 Status computation
`status-resolver.ts` (pure):
- `draftToPublish === false` → **`"published"`** (short-circuit, no timestamps consulted).
- Else: no published row → `"draft"`; `draft.updatedAt > published.updatedAt` → `"modified"`; else → `"published"`.
- **Batch variant** for list responses: fetch all published rows for the page's documentIds in one query and compute statuses in memory — **no N+1** (a hard boundary, carried from the reference).

---

## 7. Field-Type → SQL Mapping & Table Strategy

### 7.1 Column-type mapping
`field-type-mapping.ts` is the single source of truth, shared by the sync DDL and the row mapper.

| `FieldType` | Postgres column type | vs. reference | Rationale |
|---|---|---|---|
| `text` | `TEXT` | same | — |
| `richtext` | `TEXT` | same | — |
| `number` | `DOUBLE PRECISION` | **deviation** (ref: `REAL`) | `REAL` is 32-bit and loses precision; `DOUBLE PRECISION` matches JS `number` semantics and the seeds' `teamSize` integers safely. |
| `boolean` | `BOOLEAN` | same | — |
| `media` | `UUID REFERENCES media_assets(document_id) ON DELETE SET NULL` | **deviation** (ref: bare `VARCHAR`) | `media_assets` *is* a Prisma-managed table, so a real FK is a strict improvement — referential integrity + auto-null on media deletion. |
| `json` | `JSONB` | **deviation** (ref: `TEXT`) | Native `JSONB` is queryable/indexable and validates well-formedness; `techStack` in the seeds is a JSON array. |
| `component` | *(no column)* | same | Stored in a dedicated component table. |

All three deviations are called out as deliberate; they are the only places this feature diverges from the reference's column mapping.

### 7.2 Document table shape
```sql
CREATE TABLE IF NOT EXISTS "documents_<slug_underscored>" (
    id            BIGSERIAL     PRIMARY KEY,          -- ordering key (plays the reference's gorm_id role)
    document_id   UUID          NOT NULL,
    version       VARCHAR(20)   NOT NULL,             -- 'draft' | 'published' (mode B: always 'published')
    -- one column per non-component FieldDefinition, quoted, typed per §7.1:
    "wordGroup"   TEXT,
    "isMain"      BOOLEAN,
    -- ...
    created_at    TIMESTAMPTZ   NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ   NOT NULL DEFAULT now(),
    published_at  TIMESTAMPTZ,
    created_by    UUID,
    updated_by    UUID,
    published_by  UUID,
    UNIQUE (document_id, version)
);
CREATE INDEX ON "documents_<slug_underscored>" (document_id);
```
(No `locale` column — dropped for v1. No `UNIQUE(document_id, version, locale)`; just `UNIQUE(document_id, version)`.)

### 7.3 Component tables (nested)
The seeds nest components up to 3 deep (`cv-page`: `experiences → roles`; `en-it-vocab`: `phonetics → syllableParts`). The reference only documented **single-level** `components_<slug>_<component>`; this feature **extends** it for nesting (called out as a deliberate extension driven by the real seed data):

- **Naming:** `components_<slug_underscored>__<component_path_underscored>`, where `<component_path>` is the chain of `component` names from the root to this component joined by `_` (e.g. cv-page `experiences.roles` → `components_cv_page__experience_role`). A double underscore separates the slug from the component path for readability.
- **Length safety:** if the derived name would exceed Postgres's 63-byte identifier limit, it is deterministically shortened by appending a short hash of the full path and truncating (`components_<slug>__<truncated>_<hash8>`), so the mapping stays stable across boots. (Flagged in Open Questions — neither seed actually overflows, so this is forward-looking.)
- **Shape:**
  ```sql
  CREATE TABLE IF NOT EXISTS "components_<slug>__<path>" (
      id                  BIGSERIAL   PRIMARY KEY,     -- ordering (insertion order == component order)
      component_id        UUID        NOT NULL,
      document_id         UUID        NOT NULL,
      version             VARCHAR(20) NOT NULL,
      parent_component_id UUID,                          -- NULL for root-level; links to parent table's component_id
      -- one column per non-component sub-field, typed per §7.1
      "level"             TEXT,
      "skill"             TEXT,
      created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
  );
  CREATE INDEX ON "components_<slug>__<path>" (document_id, version);
  CREATE INDEX ON "components_<slug>__<path>" (parent_component_id);
  ```
  (`parent_component_id` is **not** a hard SQL FK — parent/child live in separate dynamically-created tables and a hard FK complicates DROP ordering; integrity is enforced by `component-io.service.ts`. Noted as a deliberate choice.)

---

## 8. Repository / Port Interfaces

Ports live in `domain/repositories`, each with a `Symbol(...)` DI token, matching `IMediaAssetRepository` / `MEDIA_ASSET_REPOSITORY`.

### 8.1 `IContentTypeRepository` (content-type module — Prisma-backed)
```ts
export interface IContentTypeRepository {
  create(data: UpsertContentTypeData): Promise<ContentTypeEntity>;
  update(slug: string, data: UpsertContentTypeData): Promise<ContentTypeEntity>;
  delete(slug: string): Promise<void>;
  findBySlug(slug: string): Promise<ContentTypeEntity | null>;
  findAll(): Promise<ContentTypeEntity[]>;               // full — used by sync
  findAllSummaries(): Promise<ContentTypeSummary[]>;     // name/slug/kind/draftToPublish — used by ListSummary
}
export const CONTENT_TYPE_REPOSITORY = Symbol("CONTENT_TYPE_REPOSITORY");
export class ContentTypeNotFoundError extends Error { /* name = "ContentTypeNotFoundError" */ }
```

### 8.2 `ISchemaTableRepository` (content-type module — raw DDL) — see design note §8.3
```ts
export interface ISchemaTableRepository {
  ensureDocumentTable(slug: string, fields: FieldDefinition[]): Promise<void>;   // CREATE TABLE IF NOT EXISTS
  alterDocumentTable(slug: string, plan: ColumnDiffPlan): Promise<void>;         // ADD/DROP/ALTER COLUMN
  dropDocumentTable(slug: string): Promise<void>;                                // DROP TABLE (+ all component tables)
  listDocumentColumns(slug: string): Promise<LiveColumn[]>;                      // information_schema introspection
  ensureComponentTable(slug: string, componentPath: string[], fields: FieldDefinition[]): Promise<void>;
  alterComponentTable(slug: string, componentPath: string[], plan: ColumnDiffPlan): Promise<void>;
  dropComponentTable(slug: string, componentPath: string[]): Promise<void>;
  listComponentColumns(slug: string, componentPath: string[]): Promise<LiveColumn[]>;
}
export const SCHEMA_TABLE_REPOSITORY = Symbol("SCHEMA_TABLE_REPOSITORY");
```

### 8.3 Design note — where the DDL lifecycle lives
The reference put `EnsureCollection`/`DropCollection` on `DocumentRepository`. Here that would force `content-type → document` (the sync engine, which lives in `content-type`, would depend on the document module's repo) — the **reverse** of the required one-way `document → content-type` dependency (decision #9). Resolution: **the DDL lifecycle port (`ISchemaTableRepository`) is owned and implemented entirely inside the `content-type` module**, since table lifecycle is a *schema-sync* responsibility, not a *document-row* responsibility. `IDocumentRepository`/`IComponentRepository` (document module) therefore carry **only row-level DML** and assume the table already exists (guaranteed: boot sync runs before any request). This keeps the module arrow strictly one-way and is flagged in Open Questions as the one place the port layout diverges from the reference's shape.

### 8.4 `IDocumentRepository` (document module — raw DML)
```ts
export interface IDocumentRepository {
  findByVersion(slug: string, documentId: string, version: DocumentVersion, fields: FieldDefinition[]): Promise<DocumentEntity | null>;
  upsert(slug: string, doc: DocumentEntity, fields: FieldDefinition[]): Promise<void>;      // upsert one (document_id, version) row
  deleteAllVersions(slug: string, documentId: string): Promise<void>;                        // both draft+published (mode A) or the single row (mode B)
  deleteVersion(slug: string, documentId: string, version: DocumentVersion): Promise<void>;  // unpublish
  listPaginated(slug: string, opts: ListOptions, fields: FieldDefinition[]): Promise<{ rows: DocumentEntity[]; total: number }>;
  findManyByVersion(slug: string, documentIds: string[], version: DocumentVersion, fields: FieldDefinition[]): Promise<DocumentEntity[]>; // batch, for status (no N+1)
  findSingle(slug: string, version: DocumentVersion, fields: FieldDefinition[]): Promise<DocumentEntity | null>; // single-type
}
export const DOCUMENT_REPOSITORY = Symbol("DOCUMENT_REPOSITORY");
```
`ListOptions = { start: number; size: number; orderBy: string; sortDir: "asc" | "desc"; search?: string; listFields: string[]; searchableFields: string[] }`.

### 8.5 `IComponentRepository` (document module — raw DML)
```ts
export interface IComponentRepository {
  findByDocument(slug: string, componentPath: string[], documentId: string, version: DocumentVersion, fields: FieldDefinition[]): Promise<ComponentEntity[]>;
  upsertAll(slug: string, componentPath: string[], documentId: string, version: DocumentVersion, parentComponentId: string | null, components: ComponentEntity[], fields: FieldDefinition[]): Promise<void>;
  deleteByDocument(slug: string, componentPath: string[], documentId: string, version: DocumentVersion): Promise<void>;
}
export const COMPONENT_REPOSITORY = Symbol("COMPONENT_REPOSITORY");
```

---

## 9. Use Cases / Application Services

One service class per operation (matching `covert/doc/document/use-cases.md`, **minus every `locale` param**). All resolve the content type first via `SchemaResolver` (→ 404 on unknown slug) and branch on `draftToPublish` via `DraftPublishPolicy`.

### 9.1 Document module

| Service | Method | Behaviour (locale removed) |
|---|---|---|
| `SaveDocumentService` | `execute(slug, data, documentId?, userId)` | Collection create-or-update. Mode A: upsert draft. Mode B: upsert the single live row (sets published_at/by too). New `documentId` (UUID v4) generated when absent. |
| `PublishDocumentService` | `execute(slug, documentId, userId)` | Mode A: copy draft→published (+ components). **Mode B: 400.** |
| `UnpublishDocumentService` | `execute(slug, documentId)` | Mode A: delete published row. **Mode B: 400.** |
| `GetDocumentForEditService` | `execute(slug, documentId)` | Returns draft (mode A) / live (mode B) + computed status. |
| `GetPublicDocumentService` | `execute(slug, documentId)` | Published row only; 404 if none. |
| `DeleteDocumentService` | `execute(slug, documentId)` | Delete all versions + cascade all component rows. |
| `ListDocumentsService` | `execute(slug, listQuery)` | Paginated, projected `listFields`, batch status, `total`, search/sort. |
| `DuplicateDocumentService` | `execute(slug, sourceDocumentId, userId)` | Copy source draft (mode A) / live (mode B) into a **new** draft/live with a fresh `documentId`; media refs shared (same UUIDs). |
| `BulkCreateAndPublishService` | `execute(slug, itemsData[], userId)` | ≤100. Sequential Save→Publish (mode A) / Save (mode B). All-or-nothing via **compensating `Delete`** on first failure (not a DB transaction). |
| `BulkDeleteService` | `execute(slug, documentIds[])` | ≤100. Loop `Delete` independently per ID; **partial success, no rollback**; returns `[{ documentId, error? }]`. |
| `GetSingleTypeService` | `execute(slug)` | Single-type draft/live + status; 404 if none. |
| `SaveSingleTypeService` | `execute(slug, data, userId)` | Create-or-update the singleton. |
| `PublishSingleTypeService` | `execute(slug, userId)` | Mode A only; **Mode B: 400.** |
| `UnpublishSingleTypeService` | `execute(slug)` | Mode A only; **Mode B: 400.** |

### 9.2 Content-type module

| Service | Method | Behaviour |
|---|---|---|
| `SchemaLoaderService` | `load(dir)` | Read `content-types/*.json`, parse, structurally validate (identifier regexes, `listFields`, component recursion). |
| `ContentTypeSyncService` | `onApplicationBootstrap()` / `sync(defs)` | Reconcile per §6.2 (CREATE/ALTER/DROP + upsert/delete ContentType rows). |
| `ListContentTypeService` | `execute()` | Return `ContentTypeSummary[]` (name/slug/kind/draftToPublish). |
| `GetContentTypeService` | `execute(slug)` | Return full `ContentTypeEntity`; 404 (`ContentTypeNotFoundError` → `NotFoundException`) if unknown. **Exported** — the document module's `SchemaResolver` consumes it. |

---

## 10. API Contracts

Route prefix follows this repo's `/api/<resource>` convention (**not** the reference's `/api/document-manager/...`). `locale` query param **removed everywhere**. No `/api/locales` route (out of scope).

### 10.1 Content types (read-only)
| Method | Path | Permission | Response |
|---|---|---|---|
| `GET` | `/api/content-types` | `content_type:read` | `ContentTypeSummary[]` |
| `GET` | `/api/content-types/:slug` | `content_type:read` | full `ContentType` or `404` |

### 10.2 Single-type documents
| Method | Path | Permission | Response |
|---|---|---|---|
| `GET` | `/api/documents/single-type/:slug` | `document:read` | `Document` or `404` (empty form) |
| `PUT` | `/api/documents/single-type/:slug` | `document:update` | `Document` (create-on-first-save) |
| `POST` | `/api/documents/single-type/:slug/publish` | `document:publish` | `{ "status": "published" }` — `400` in mode B |
| `POST` | `/api/documents/single-type/:slug/unpublish` | `document:unpublish` | `{ "status": "draft" }` — `400` in mode B |

### 10.3 Collection-type documents
| Method | Path | Permission | Response |
|---|---|---|---|
| `GET` | `/api/documents/collection-type/:slug` | `document:read` | `PaginatedList` |
| `POST` | `/api/documents/collection-type/:slug/bulk` | `document:create` **and** `document:publish` | `{ "items": [...] }` (201) |
| `DELETE` | `/api/documents/collection-type/:slug/bulk` | `document:delete` | `200 { "deleted": [...], "failed": [...] }` |
| `POST` | `/api/documents/collection-type/:slug` | `document:create` | `Document` (201) |
| `GET` | `/api/documents/collection-type/:slug/:documentId` | `document:read` | `Document` or `404` |
| `PUT` | `/api/documents/collection-type/:slug/:documentId` | `document:update` | `Document` |
| `DELETE` | `/api/documents/collection-type/:slug/:documentId` | `document:delete` | `204` |
| `POST` | `/api/documents/collection-type/:slug/:documentId/publish` | `document:publish` | `{ "status": "published" }` — `400` in mode B |
| `POST` | `/api/documents/collection-type/:slug/:documentId/unpublish` | `document:unpublish` | `{ "status": "draft" }` — `400` in mode B |
| `POST` | `/api/documents/collection-type/:slug/:documentId/duplicate` | `document:create` | `Document` (201) |

> **Route-ordering note:** the two `/bulk` routes **must** be declared before the `/:documentId` routes in the controller, or NestJS captures `"bulk"` as a `documentId`. Called out because it's a real footgun with this path shape.

### 10.4 Public reads (no auth)
| Method | Path | Auth | Response |
|---|---|---|---|
| `GET` | `/api/public/documents/collection-type/:slug/:documentId` | none | published `Document` or `404` |
| `GET` | `/api/public/documents/single-type/:slug` | none | published `Document` or `404` |

> The single-type public route is **new** — the reference documented only a collection-type public route (`GET /api/public/document-manager/:slug/:documentId`). This fills that gap; flagged in Open Questions for confirmation of shape.

### 10.5 List query params (collection GET)
| Param | Default | Max | Notes |
|---|---|---|---|
| `start` | `0` | — | offset |
| `size` | `20` | `100` | page size; `>100` → 400 |
| `orderBy` | `id` (insertion order) | — | validated per-request against a **dynamic allowlist**: system fields + any content field of type `text`/`number`/`boolean`. `richtext`/`media`/`json`/`component` never sortable. Invalid → 400. |
| `sortDir` | `desc` | — | `asc`\|`desc` |
| `search` | *(none)* | — | partial, **case-insensitive substring** (`ILIKE`, value escaped for `%`/`_`/`\` with `ESCAPE '\'`), OR'd across the projected `listFields` restricted to `text`/`richtext`. `json`/`media`/`number`/`boolean`/`component` never searched. Empty search or no searchable fields → no-op. |

`orderBy`/`search` column names are re-validated by `where-builder.ts` against the schema allowlist (defence-in-depth) before interpolation — never trusting the parsed value alone.

### 10.6 Body shapes
**Save (single item, single-type PUT / collection POST/PUT):**
```json
{ "data": { "position": "Engineer", "isMain": true, "skills": [ { "level": "expert", "skill": "TypeScript" } ] } }
```
**Bulk create+publish** (`POST .../bulk`): `{ "items": [ { "data": { ... } }, ... ] }` — 1–100 items; each `data` is the same shape as a single create; `?locale=` removed. All-or-nothing via compensating delete on first failure. 400 (before the service) on empty/over-100/malformed body.
**Bulk delete** (`DELETE .../bulk`): `{ "documentIds": ["...", "..."] }` — 1–100 IDs. Always `200`; `{ "deleted": [...], "failed": [ { "documentId", "error" } ] }`. Partial-success, no rollback.

### 10.7 Response shapes
Single document (both kinds): `{ "data": { "documentId", "status", "createdAt", "updatedAt", ...contentFields } }` — system + content fields merged flat inside `data`; `status` included; internal `id`/`version` excluded. (`updatedByName` from the reference is **omitted** for v1 unless a `User` join is added — see Open Questions.)
Paginated list: `{ "items": [ { "documentId", "data": {/* only listFields */}, "status", "createdAt", "updatedAt" } ], "total", "start", "size" }`.

### 10.8 Input validation (controller-level)
- **Slug** — `^[a-z0-9]+(?:-[a-z0-9]+)*$` on every route reading `:slug`; 400 (not 500) on invalid.
- **documentId** — UUID v4 on every route reading `:documentId`; 400 on invalid.
- **No gRPC** (repo is REST-only) — the reference's `DocumentService`/`ContentTypeService` protos are dropped.

---

## 11. Code Style

Ports and DI tokens follow the exact `media` shape (`Symbol(...)` token + interface + `NotFoundError` subclass). Example — the content-type port:

```ts
// src/modules/content-type/domain/repositories/content-type.repository.ts
import { ContentTypeEntity } from "../entities/content-type.entity";
import { FieldDefinition, ContentKind } from "../entities/field-definition";

export interface UpsertContentTypeData {
  slug: string;
  name: string;
  kind: ContentKind;
  draftToPublish: boolean;
  fields: FieldDefinition[];
  listFields: string[];
}

export interface IContentTypeRepository {
  create(data: UpsertContentTypeData): Promise<ContentTypeEntity>;
  update(slug: string, data: UpsertContentTypeData): Promise<ContentTypeEntity>;
  delete(slug: string): Promise<void>;
  findBySlug(slug: string): Promise<ContentTypeEntity | null>;
  findAll(): Promise<ContentTypeEntity[]>;
  findAllSummaries(): Promise<Pick<ContentTypeEntity, "name" | "slug" | "kind" | "draftToPublish">[]>;
}

export const CONTENT_TYPE_REPOSITORY = Symbol("CONTENT_TYPE_REPOSITORY");

export class ContentTypeNotFoundError extends Error {
  constructor(slug: string) {
    super(`Content type "${slug}" not found`);
    this.name = "ContentTypeNotFoundError";
  }
}
```

Controllers repeat guards **per route** (never class-level), matching `MediaController`:

```ts
@Get(":slug")
@UseGuards(JwtAuthGuard, PermissionsGuard)
@RequirePermissions("content_type:read")
async get(@Param("slug") slug: string): Promise<ContentTypeEntity> {
  return this.getContentTypeService.execute(slug);
}
```

Services inject ports by token (`@Inject(CONTENT_TYPE_REPOSITORY) private readonly contentTypes: IContentTypeRepository`); modules bind `{ provide: TOKEN, useClass: PrismaImpl }` and `export` what downstream modules need (`ContentTypeModule` exports `GetContentTypeService` + `CONTENT_TYPE_REPOSITORY`).

---

## 12. Boundaries

| Rule | Detail |
|---|---|
| **Always** | Validate slug (`^[a-z0-9]+(?:-[a-z0-9]+)*$`) and field-name (`^[a-zA-Z][a-zA-Z0-9]*$`) via `assertSafe*` **before** any SQL identifier interpolation — on every boot and every request. |
| **Always** | Parameterise every SQL *value*; only *identifiers* are interpolated, and only after `quoteIdent`. |
| **Always** | Validate `listFields` and `orderBy`/`search` fields against the content type's own schema (per-request, per-content-type). |
| **Always** | Batch-fetch published rows for list status computation (no N+1). |
| **Always** | Return 404 (not an empty object) on single-type GET when no document exists. |
| **Always** | Include computed `status` in every document response. |
| **Always** | Project `data` to `listFields` in collection list responses. |
| **Always** | Return 400 (not 500) for invalid slug/documentId, and for publish/unpublish on a `draftToPublish: false` content type. |
| **Ask first** | Changing default `size` (20) or max (100). |
| **Ask first** | Adding a hard SQL FK for `parent_component_id`, or changing the component table-name scheme. |
| **Ask first** | Adding `updatedByName` (needs a `User` join not currently modelled here). |
| **Never** | Expose any create/edit/delete route for **ContentType structure** — JSON files are the only source of truth. |
| **Never** | `DROP TABLE` + recreate on a schema change — only diff-based `ALTER` (data-preserving). |
| **Never** | Let sync write back to the JSON definition files (one-directional). |
| **Never** | Expose `DELETE` for single-type documents; never put `:documentId` in single-type URLs. |
| **Never** | Return draft data through a public read route. |
| **Never** | Allow `size` > 100, or > 100 items in bulk create/delete. |
| **Never** | Attempt rollback on a bulk-delete partial failure (opposite of bulk-create's compensating rollback). |
| **Never** | Touch `prisma/mysql/schema.prisma` / `prisma/sqlite/schema.prisma` — this feature is **PostgreSQL-only**; those stay empty stubs (same limitation as every prior cycle). |
| **Never** | Add gRPC (repo is REST-only) or any admin-frontend artifact (repo is API-only). |
| **Never** | Include `locale` anywhere (out of scope for v1). |
| **Known gap** | Bulk create+publish does **not** reject an item with a missing/empty `data` — it creates a document with empty fields (kept intentional, from the reference). |
| **Known gap** | `createdBy`/`updatedBy`/`publishedBy` may be `null` — no caller-identity plumbing exists yet in this repo (same gap as `permissions`/`media`). |

---

## 13. Testing Strategy

Jest, `.spec.ts` co-located with each source file (mocked ports via `Test.createTestingModule` + `useValue`, or plain `new`). Reuse `test/utils/app-test.util.ts` (`bootTestApp`) for e2e. Per repo rule, **no `coverageThreshold` entries** for Prisma repositories (`prisma-*.repository.ts`) or controllers (`presentation/*.controller.ts`) — still write their specs, just no enforced branch gate.

**Sync (`content-type-sync.service.spec.ts`, `schema-differ.spec.ts`):** new file → CREATE table + component tables; changed file → ALTER (add/drop column); removed field → DROP COLUMN, other columns' data untouched; deleted file → DELETE ContentType + DROP tables (cascade components); pure differ produces the right plan from (liveColumns, desiredFields).

**Schema loader/validator (`schema-loader.service.spec.ts`, `schema-validator.spec.ts`):** valid JSON parses; `listFields` referencing an unknown field → error; malformed JSON → error; bad slug/field/component name → error; recursive component validation (3-level seeds).

**Document services (one spec each):** Save upserts draft, never touches published (mode A); Save writes the single live row (mode B); Publish copies draft→published + sets timestamps (mode A) / **400 (mode B)**; Unpublish deletes published (mode A) / **400 (mode B)**; status computation draft/modified/published (mode A) and always-published short-circuit (mode B); single-type GET 404 when empty, SaveSingleType creates on first save; list pagination + batch status + projection + search/sort allowlist (invalid `orderBy` → 400); Duplicate makes a fresh `documentId`; BulkCreateAndPublish all-valid ordering + mid-batch rollback on Save failure + rollback of the current item on Publish failure; BulkDelete all-succeed / one-fails-rest-proceed / all-fail / empty-slice no-panic.

**Component I/O (`component-io.service.spec.ts`):** recursive extract on save, recursive hydrate on read, cascade delete; 3-level nesting from the seeds.

**Controllers:** single-type GET 200/404, PUT create/update, publish/unpublish (incl. 400 in mode B); collection list/CRUD/publish/unpublish/duplicate; bulk 201 / 400 (empty/over-100/malformed); slug/documentId 400.

**Raw repositories (`prisma-*.repository.spec.ts`):** value round-trip through typed columns per field type (incl. `JSONB`, `media` UUID, `DOUBLE PRECISION`); DDL introspection maps `information_schema` correctly. (No coverage gate.)

**e2e (`test/content-engine.e2e-spec.ts`, real Postgres):** boot sync materialises the two seed content types' tables; full create→publish→public-read for a mode-A collection; mode-B create is immediately public without publish; publish on a mode-B type → 400; 401 unauthenticated, 403 under-permissioned; bulk create+publish + bulk delete happy/partial paths. `afterAll` drops the seeded dynamic tables it created.

---

## 14. Success Criteria

1. On a clean Postgres, `bun run start` boots and the sync engine creates `content_types` rows + `documents_cv_page`, `documents_en_it_vocab`, and all their (nested) `components_*` tables — with **zero** hand-written per-content-type code.
2. Editing a seed JSON (add/remove/rename a field) and rebooting **alters** the table via diff (verified: unchanged columns' data survives; no `DROP TABLE`).
3. Deleting a seed JSON and rebooting removes the ContentType row and drops its tables (cascade components).
4. Full REST surface works over both seeds: collection list (paginated, projected, searchable, sortable), single GET, create/update, publish/unpublish, delete, duplicate, bulk create+publish, bulk delete — dispatched purely on `:slug` + schema.
5. `draftToPublish: true` behaves as reference draft/publish (two rows, computed status, public reads published only). Setting a content type to `draftToPublish: false` makes Save immediately public, forces status `published`, and makes publish/unpublish return **400**.
6. Nested repeatable components (3 levels) round-trip correctly through save→read (order preserved; parent/child linkage intact).
7. All permission slugs enforced; content-type structure has **no** write route; public reads never leak draft data.
8. `bun run build`, `bunx tsc --noEmit`, `bunx eslint .`, `bun run test:cov` green; e2e green against real Postgres. Every source file ≤ 500 lines. No changes to the mysql/sqlite schema stubs.
9. Module dependency is strictly one-way (`document → content-type`); no reverse import.

---

## 15. Open Questions

1. **DDL-port placement (§8.3).** This spec moves `Ensure/Alter/Drop` off `IDocumentRepository` (the reference's home) onto a content-type-owned `ISchemaTableRepository` to keep the module arrow one-way. The task's port list implied those methods on `IDocumentRepository`. Confirm the relocation before Plan (the alternative — dependency-inversion with the token in content-type and the adapter in document, wired at the composition root — is more machinery for the same result).
2. **Field type-change safety (§6.2).** For an incompatible `ALTER COLUMN ... TYPE` (e.g. `text` → `number` with non-numeric data), the plan is drop-old + add-new (losing that one field's data, everything else intact) with a warning log. Acceptable, or should an incompatible retype instead **abort the boot** and demand an explicit manual migration?
3. **Nested component table-name length (§7.3).** The hash-truncation fallback is defined but untriggered by the two seeds. Confirm the exact truncation format (or cap nesting depth) before it matters.
4. **`updatedByName` in responses.** The reference resolves a `User.displayName` join into responses. This repo's `updatedBy` is a nullable UUID with no join modelled in the dynamic tables. Dropped for v1 (responses expose the raw `updatedBy` UUID or omit it). Confirm that's acceptable, or add a resolver.
5. **`draftToPublish` for the two seeds.** Assumed `true` for both `cv-page` and `en-it-vocab` (reference default = always-on). Nothing in the JSON contents argues otherwise. Confirm — a live public dictionary/CV might instead prefer `false` (edits instantly live).
6. **`media`-type FK cardinality.** Mapped as a single `UUID` FK to `media_assets`. If a field ever needs *multiple* media refs, that needs either a `json` array of UUIDs (no FK) or a component. Out of scope now; noted.
7. **Bootstrap hook ordering.** Sync and `SeedDefaultDataService` are both `onApplicationBootstrap` hooks with no data dependency; if a strict order is ever required, it must be pinned via module import order. No action needed unless a dependency emerges.
