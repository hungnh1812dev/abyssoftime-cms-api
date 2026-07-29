# Plan: Dynamic GraphQL API

See `SPEC.md` for the full spec (objective, confirmed decisions, field/naming/filter mapping, code style, testing strategy, boundaries, success criteria).

## Context

New `src/modules/graphql/` module exposes `POST /graphql` (Apollo/`@nestjs/graphql` schema-first, `forRootAsync`), built dynamically from `content-types/*.json` (read directly via `ContentTypeModule`'s `SchemaLoaderService`, sidestepping the `OnApplicationBootstrap` DB-sync timing race — see `SPEC.md` decision #4). Every resolver delegates to existing `document`/`content-type` services; the `graphql` module owns zero business logic and zero Prisma/SQL access. Auth is `Authorization: Bearer <api-token>` via the currently-unwired `ApiTokenGuard`'s verification logic (reused, not `@UseGuards`'d directly, since Apollo's `context` function isn't a Nest route).

Real seeds (`cv-page`, `en-it-vocab`) are both `collection`-kind, Mode A (`draftToPublish: true`), with **no `media`-typed field and no `single`-kind content type** — matching `document.md`'s own precedent, media/component/single-type e2e coverage needs a throwaway content type built via a direct `ContentTypeSyncService.sync([...realDefs, throwawayDef])` call, not a file on disk.

### Two refinements discovered during planning (not fully spelled out in SPEC.md)

1. **New `document`-module file, `list-documents-full.service.ts` (`ListDocumentsFullService`)** — REST's `ListDocumentsService` projects every row down to `contentType.listFields` (a REST-admin-list-view concept); a GraphQL client selects arbitrary fields per query, so reusing it as-is would silently null out anything outside the configured list columns. The new service returns full hydrated rows (mirrors `GetPublicDocumentService`'s shape, pluralized + paginated), **always published-only** — which matches the source doc exactly: its `<slug>List` query has no `status` arg, only the single-item query does. This means List needs **no auth and no per-row status computation** in v1 — simpler than SPEC.md implied. A new file only; `ListDocumentsService` itself is untouched.
2. **`update<Type>` mutation re-reads after save**, mirroring REST's own `PUT :slug/:documentId` (`document.md`: "Saves then re-reads... an update can legitimately turn `published` into `modified`") — `SaveDocumentService`'s return value is an unhydrated echo of the client's input `data`, not the persisted+hydrated row. `create<Type>` does **not** re-read, matching REST's `POST :slug` (`document.md`: "create/duplicate never need a re-read").

Known accepted trade-off carried into v1: `ListDocumentsFullService` hydrates components per row (no cross-row batching) — a real N+1 across a page, same category of trade-off this repo already accepts elsewhere (e.g. `listPaginated`'s two-round-trip count+data query). Not a blocker; noted for the eventual doc.

## Dependency graph

```
Phase 1 — Foundation + minimal single-query vertical slice
  (deps, module skeleton, field-type-mapping, naming, SDL for scalar
   single-query, resolver delegating to GetPublicDocumentService /
   GetDocumentForEditService, context factory + authorize util,
   boot wiring, additive exports, dev-only introspection)
    │
    ├──▶ Phase 2 — List query (ListDocumentsFullService, list-args translator, filter/orderBy/pagination)
    │        │
    │        └──▶ Phase 3 — Media + component recursive resolution (nested SDL, per-field media resolvers)
    │                 │
    │                 └──▶ Phase 4 — Mutations (create/update/delete/publish/unpublish, permission checks)
    │                          │
    │                          └──▶ Phase 5 — Single-type support (query + mutations)
    │                                   │
    │                                   └──▶ Phase 6 — Hardening (error-shape mapping, introspection re-verify, five-axis review)
    │                                            │
    │                                            └──▶ Phase 7 — Docs + close-out
```

Each phase leaves `bun run build` / `bunx tsc --noEmit` / `bun run lint` / `bun run test:cov` green and the app boots. Phases 1–5 are strictly sequential (each extends the schema builder and resolver factory the previous phase created); Phase 6/7 depend on all feature phases being done.

---

## Phase 1 — Foundation + minimal single-query vertical slice

### Task 1.1 — Install deps, scaffold module skeleton, wire boot-time gating

**Description:** Add `@nestjs/graphql`, `@nestjs/apollo`, `@apollo/server`, `graphql` to `package.json`. Create `src/modules/graphql/graphql.module.ts` with `GraphQLModule.forRootAsync` — `useFactory` reads `process.env.NODE_ENV` for `introspection`/`playground` gating (dev-only per SPEC.md decision #6) and returns a placeholder `typeDefs: "type Query { _empty: String }"` (real SDL comes in Task 1.3). Register `GraphqlModule` in `src/app.module.ts` after `DocumentModule`.

**Acceptance criteria:**
- [ ] `bun run start:dev` boots; `POST /graphql` with `{ "query": "{ _empty }" }` returns `{"data":{"_empty":null}}`.
- [ ] Introspection query fails when `NODE_ENV=production bun run start:dev`; succeeds otherwise.

**Verification:** `bun run build`; manual curl against both `NODE_ENV` values.

**Dependencies:** None.

**Files:** `package.json`, `src/modules/graphql/graphql.module.ts`, `src/app.module.ts`.

**Scope:** S.

---

### Task 1.2 — `field-type-mapping.ts` + `naming.ts` (pure functions, unit-tested)

**Description:** `domain/field-type-mapping.ts`: `FieldType -> GraphQL type name` per SPEC.md's table (`text`/`richtext` → `String`, `number` → `Float`, `boolean` → `Boolean`, `media` → `"MediaAsset"`, `json` → `"JSON"`, `component` → `null` — caller derives the nested type name via `naming.ts`). `domain/naming.ts`: slug → PascalCase type name, camelCase query name, `<Type>List`/`<Type>Input`/`<Type>Filter`/`<Type>OrderBy`, and `<ContentType><ComponentName>` PascalCase for component types.

**Acceptance criteria:**
- [ ] Every `FieldType` maps correctly (component → `null`); every naming derivation matches SPEC.md's table for both real seeds' slugs (`cv-page` → `CvPage`/`cvPage`/`cvPageList`, `en-it-vocab` → `EnItVocab`/...).

**Verification:** `field-type-mapping.spec.ts`, `naming.spec.ts` — `bun run test:cov`.

**Dependencies:** None (parallel with 1.1).

**Files:** `src/modules/graphql/domain/field-type-mapping.ts` (+spec), `src/modules/graphql/domain/naming.ts` (+spec).

**Scope:** S.

---

### Task 1.3 — Additive exports from `content-type`/`document` (no internal logic touched)

**Description:** `ContentTypeModule`: add `SchemaLoaderService` to `exports`. `DocumentModule`: add an `exports` array (currently absent) listing `GetPublicDocumentService`, `GetDocumentForEditService` (needed starting this phase; the rest — `SaveDocumentService`, `PublishDocumentService`, `UnpublishDocumentService`, `DeleteDocumentService`, and the five single-type services — get added to the same array in Phases 4–5, one array, grown incrementally rather than dumped all at once so each phase's diff stays reviewable).

**Acceptance criteria:**
- [ ] `content-type.module.spec.ts` / `document.module.spec.ts` updated to assert the new exports; both still pass with zero other assertions changed.
- [ ] No file inside `content-type`'s or `document`'s `application`/`domain`/`infrastructure`/`presentation` folders is edited.

**Verification:** `bun run test:cov` (both module specs); `git diff --stat` shows only the two `*.module.ts` files + their specs changed inside those two modules.

**Dependencies:** None (parallel with 1.1/1.2).

**Files:** `src/modules/content-type/content-type.module.ts` (+spec), `src/modules/document/document.module.ts` (+spec).

**Scope:** S.

---

### Task 1.4 — `schema-builder.service.ts`: SDL generation, scalar fields + single query only

**Description:** `application/schema-builder.service.ts`, `SchemaBuilderService.buildTypeDefs(): Promise<string>` — calls `SchemaLoaderService.load()`, and for each `collection`-kind definition emits: the object type (scalar fields only — `text`/`richtext`/`number`/`boolean`/`json`, per Task 1.2's mapping; `media`/`component` fields skipped in this task, added in Phase 3), plus `Query.<slug>(Id: ID!, status: String): <Type>`. No mutations, no list query, no filter/orderBy input types yet (Phases 2/4). `single`-kind definitions are skipped entirely in this task (Phase 5).

**Acceptance criteria:**
- [ ] Given `cv-page`'s definition, generated SDL includes `type CvPage { position: String isMain: Boolean company: String summary: String }` and `type Query { cvPage(Id: ID!, status: String): CvPage }` (component fields `skills`/`experiences`/etc. absent for now).
- [ ] `en-it-vocab` produces the analogous scalar-only type + query.
- [ ] Calling `buildTypeDefs()` twice returns identical SDL (deterministic ordering).

**Verification:** `schema-builder.service.spec.ts` (mocked `SchemaLoaderService`) — `bun run test:cov`.

**Dependencies:** Task 1.2 (field-type-mapping, naming), Task 1.3 (`SchemaLoaderService` export).

**Files:** `src/modules/graphql/application/schema-builder.service.ts` (+spec).

**Scope:** M.

---

### Task 1.5 — `graphql-context.factory.ts` + `authorize.util.ts`

**Description:** `application/graphql-context.factory.ts` — given the raw HTTP request, reads `Authorization: Bearer <token>` (mirrors `ApiTokenGuard`'s own steps: missing/malformed header → no token in context, not a thrown error — GraphQL context building must never throw for an *absent* token, since unauthenticated access is valid for published reads; SHA-256 hash + `ACCESS_TOKEN_REPOSITORY.findByTokenHash`; expired → no token in context), returns `{ apiToken: ApiTokenPayload | null }`. `application/authorize.util.ts` — `assertApiTokenPermission(context, slug: string): void`, throws a `GraphQLError` with `extensions.code = "UNAUTHENTICATED"` (no token) or `"FORBIDDEN"` (token present, slug missing from `apiToken.permissions`).

**Acceptance criteria:**
- [ ] Missing header / malformed header / unknown hash / expired token all resolve to `{ apiToken: null }`, never throw.
- [ ] Valid, non-expired token resolves to `{ apiToken: { documentId, name, permissions } }`.
- [ ] `assertApiTokenPermission` throws `UNAUTHENTICATED` for `null` context, `FORBIDDEN` for a token missing the required slug, passes silently otherwise.

**Verification:** `graphql-context.factory.spec.ts` (branch-for-branch parity with `api-token.guard.spec.ts`'s 6 cases, minus the throw-on-missing-token behavior), `authorize.util.spec.ts` — `bun run test:cov`.

**Dependencies:** None (parallel with 1.4).

**Files:** `src/modules/graphql/application/graphql-context.factory.ts` (+spec), `src/modules/graphql/application/authorize.util.ts` (+spec).

**Scope:** S.

---

### Task 1.6 — `resolver-factory.service.ts`: single-query resolver, wire into `graphql.module.ts`

**Description:** `application/resolver-factory.service.ts`, `ResolverFactoryService.buildResolvers(): Record<string, any>` — for each collection-type, `Query.<slug>` resolver: `status !== "draft"` → `GetPublicDocumentService.execute(slug, Id)`, catching its `NotFoundException` and returning `null` (GraphQL nullable, not an error); `status === "draft"` → `assertApiTokenPermission(context, "document:read")` then `GetDocumentForEditService.execute(slug, Id).then(r => r.document)`, same 404→`null` handling. Wire `SchemaBuilderService`/`ResolverFactoryService`/`graphql-context.factory` into `graphql.module.ts`'s `forRootAsync` (real `typeDefs` + `resolvers`, real `context` function), replacing Task 1.1's placeholder. Import `ContentTypeModule`, `DocumentModule`, `AccessTokenModule` in `GraphqlModule`.

**Acceptance criteria:**
- [ ] `{ cvPage(Id: "...") { position } }` against a real published `cv-page` document returns its data, no token required.
- [ ] Same query for a nonexistent `Id` returns `{ "data": { "cvPage": null } }`, not a GraphQL error.
- [ ] `{ cvPage(Id: "...", status: "draft") { position } }` without a token → `UNAUTHENTICATED` GraphQL error; with a `document:read`-scoped token → returns the draft data.

**Verification:** `resolver-factory.service.spec.ts` (mocked services) — `bun run test:cov`; `bun run build`.

**Dependencies:** Tasks 1.3, 1.4, 1.5.

**Files:** `src/modules/graphql/application/resolver-factory.service.ts` (+spec), `src/modules/graphql/graphql.module.ts`.

**Scope:** M.

---

### Checkpoint 1 (automated + manual)

- [ ] `bun run build` / `bunx tsc --noEmit` / `bun run lint` / `bun run test:cov` all green.
- [ ] Manual `bun run start:dev` walkthrough: query a real `cv-page` document published/draft, with/without a token — matches Task 1.6's acceptance criteria live against real Postgres.
- [ ] **Commit** (per `docs/rules/workflow.md`: commit once this checkpoint's automated checks pass).

---

## Phase 2 — List query

### Task 2.1 — `ListDocumentsFullService` (new file, `document` module)

**Description:** `src/modules/document/application/services/list-documents-full.service.ts` — mirrors `ListDocumentsService`'s structure (`schemaResolver.resolve` → `assertKind(contentType, "collection")` → `documents.listPaginated`) but: always reads the `"published"` version (no `resolveSaveVersion` branch — matches the source doc's status-less list query), returns full hydrated rows (`{ ...row.fields, ...await componentIo.hydrateComponents(...) }` per row, injecting `ComponentIoService`) with **no** `listFields` projection, no status computation. Takes a typed `FullListOptions` (`{ start, size, orderBy, sortDir, filters: ParsedFilter[] }` — no `search`, no string parsing, matching SPEC.md decisions #7/#8) instead of REST's string-keyed `ListQueryParams`.

**Acceptance criteria:**
- [ ] Given 3 published rows, returns all 3 fully hydrated (including any component data), respecting `start`/`size`/`orderBy`/`filters`.
- [ ] A `draft`-only row (never published) never appears.
- [ ] `assertKind` throws for a `single`-kind slug.

**Verification:** `list-documents-full.service.spec.ts` (mocked repository/`ComponentIoService`) — `bun run test:cov`. Add to `DocumentModule`'s `exports` (Task 1.3's array, grown here) + `document.module.spec.ts`.

**Dependencies:** Phase 1 complete.

**Files:** `src/modules/document/application/services/list-documents-full.service.ts` (+spec), `src/modules/document/document.module.ts` (+spec).

**Scope:** M.

---

### Task 2.2 — `list-args.translator.ts`: GraphQL `where`/`orderBy` args → `ParsedFilter[]`

**Description:** `src/modules/graphql/application/list-args.translator.ts` — `translateListArgs(contentType, args: { where?, orderBy?, start?, size? }): FullListOptions`. Reuses `sortableColumnsFor` (`document`'s `where-builder.ts`, plain function import — no new export needed) for the `orderBy` allowlist and `LISTABLE_FIELD_TYPES`/`FieldType` (`content-type`'s `field-definition.ts`, also a plain import) to validate `where`'s field/operator legality against SPEC.md's v1 operator set (`eq`/`ne`/`contains` text, `eq`/`ne`/`gt`/`gte`/`lt`/`lte` number, `eq` boolean — decision #7, no `startsWith`/`endsWith`/`in`). GraphQL's own type system means no string coercion is needed (values arrive as real `Int`/`Float`/`Boolean`/`String`).

**Acceptance criteria:**
- [ ] `where: { featured: { eq: true } }` on a boolean field → `[{ column: "featured", operator: "$eq", value: true }]`.
- [ ] An unknown field or an operator illegal for the field's type throws a `GraphQLError` (`BAD_USER_INPUT`), matching REST's 400-equivalent semantics.
- [ ] `orderBy`/`start`/`size` defaults match SPEC.md/REST parity where sensible (`start: 0`, `size: 20`, capped `100`).

**Verification:** `list-args.translator.spec.ts` — `bun run test:cov`.

**Dependencies:** Task 2.1 (needs `FullListOptions` shape).

**Files:** `src/modules/graphql/application/list-args.translator.ts` (+spec).

**Scope:** M.

---

### Task 2.3 — SDL: `<Type>Filter`/`<Type>OrderBy` input types + list query; resolver-factory wiring

**Description:** Extend `schema-builder.service.ts` to emit `<Type>Filter` (nested `eq`/`ne`/`contains`/... operator input per scalar field, `AND`/`OR`/`NOT` — `component`-nested filters deferred to Phase 3, since component types don't exist in SDL until then), `<Type>OrderBy` (enum-valued per sortable field), and `Query.<slug>List(where, orderBy, start, size): [<Type>!]!`. Extend `resolver-factory.service.ts`: `<slug>List` resolver calls `list-args.translator` then `ListDocumentsFullService.execute`.

**Acceptance criteria:**
- [ ] `{ cvPageList(where: { isMain: { eq: true } }, start: 0, size: 10) { position } }` returns matching published rows, no token required.
- [ ] Invalid filter field/operator → GraphQL error, not a 500 or silently-ignored filter.

**Verification:** `schema-builder.service.spec.ts` / `resolver-factory.service.spec.ts` extended — `bun run test:cov`; `bun run build`.

**Dependencies:** Tasks 2.1, 2.2.

**Files:** `src/modules/graphql/application/schema-builder.service.ts`, `src/modules/graphql/application/resolver-factory.service.ts` (both already have specs from Phase 1, extended here).

**Scope:** M.

---

### Checkpoint 2

- [ ] `bun run build` / `bunx tsc --noEmit` / `bun run lint` / `bun run test:cov` green.
- [ ] Manual: `cvPageList` with a filter + orderBy + pagination against real seeded data.
- [ ] **Commit.**

---

## Phase 3 — Media + component recursive resolution

### Task 3.1 — `MediaAssetRepository` export + `MediaAsset` GraphQL type + field resolver

**Description:** `MediaModule`: add `exports: [MEDIA_ASSET_REPOSITORY]` (currently has none). `schema-builder.service.ts`: emit the static `type MediaAsset { documentId: ID! url: String! thumbnailUrl: String! fileName: String! width: Int! height: Int! }` once per schema (not per content type), and map `media`-typed fields to it. `resolver-factory.service.ts`: for every `media`-typed field (document root — nested components come in Task 3.2), a field resolver on the parent type that takes the raw UUID FK string already present on the hydrated object and resolves it via `MEDIA_ASSET_REPOSITORY.findByDocumentId`, returning `null` for a `null`/dangling FK (never throws — matches `document.md`'s "dangling id resolves to null, never throw" precedent for `updatedBy`).

**Acceptance criteria:**
- [ ] A `media`-typed field with a valid FK resolves to the full `MediaAsset` object; `null` FK or a dangling (deleted) FK resolves to `null`, not an error.

**Verification:** `resolver-factory.service.spec.ts` extended (mocked `MEDIA_ASSET_REPOSITORY`) — `bun run test:cov`. Real e2e coverage needs a throwaway content type with a `media` field (neither real seed has one) — noted for Phase 3's e2e task.

**Dependencies:** Phase 2 complete.

**Files:** `src/modules/media/media.module.ts` (+spec), `src/modules/graphql/application/schema-builder.service.ts`, `src/modules/graphql/application/resolver-factory.service.ts`.

**Scope:** M.

---

### Task 3.2 — Recursive component SDL + resolvers (arbitrary nesting depth)

**Description:** Extend `schema-builder.service.ts` to recurse into `component`-typed fields: emit `<ContentType><ComponentName>` PascalCase nested object types (per Task 1.2's naming), field type = the nested type (array-wrapped if `repeatable`), recursing through every nesting level (real seeds exercise 2–3 levels, e.g. `cv-page`'s `experiences → roles`, `en-it-vocab`'s `phonetics → syllableParts`). `resolver-factory.service.ts`: since `ComponentIoService.hydrateComponents` already returns nested plain objects/arrays matching this exact shape (per `document.md`), no extra resolver logic is needed for component fields themselves — only their own `media`-typed sub-fields need the Task 3.1 field-resolver pattern, applied recursively at every level.

**Acceptance criteria:**
- [ ] `cv-page`'s full 3-level shape (`experiences → roles`) round-trips through a GraphQL query selecting nested fields at every level, matching the REST API's existing e2e assertions for the same document.
- [ ] A `json`-typed nested field (e.g. `techStack`) returns a real array via the `JSON` scalar, not a string (parity with `document.md`'s existing REST assertion).

**Verification:** `schema-builder.service.spec.ts` extended (both real seeds' full nested shape) — `bun run test:cov`.

**Dependencies:** Task 3.1.

**Files:** `src/modules/graphql/application/schema-builder.service.ts`, `src/modules/graphql/application/resolver-factory.service.ts`.

**Scope:** M.

---

### Task 3.3 — e2e: `test/graphql.e2e-spec.ts` (new file), read-path coverage

**Description:** New e2e file, `bootTestApp` infra (matching `content-engine.e2e-spec.ts`'s pattern). Covers Phases 1–3's full read path against real Postgres: single query (published/draft, with/without token), list query (filter/orderBy/pagination), the real seeds' 3-level component nesting, and a throwaway content type (built the same in-memory `ContentTypeSyncService.sync([...realDefs, throwawayDef])` way `content-engine.e2e-spec.ts` uses for its Mode-B case) with a real `media`-typed field, exercising Task 3.1's `MediaAsset` resolution against an uploaded asset. Creates its own API tokens via `ACCESS_TOKEN_REPOSITORY` directly (or `CreateAccessTokenService`) scoped `document:read`, cleaned up in `afterAll` alongside any throwaway content type/documents/tokens, `runId`-suffixed to avoid cross-run collisions — same discipline `content-engine.e2e-spec.ts` already documents.

**Acceptance criteria:**
- [ ] All of Phases 1–3's acceptance criteria proven against real Postgres, not mocks.
- [ ] `afterAll` leaves no throwaway content type, table, token, or document behind.

**Verification:** `bun run test:e2e` green.

**Dependencies:** Task 3.2.

**Files:** `test/graphql.e2e-spec.ts` (new).

**Scope:** M.

---

### Checkpoint 3

- [ ] `bun run test:e2e` green (all suites).
- [ ] Manual: nested component + media query against `bun run start:dev`.
- [ ] **Commit.**

---

## Phase 4 — Mutations (collection-type)

### Task 4.1 — Export remaining collection-type services; SDL for `<Type>Input` + mutations

**Description:** Grow `DocumentModule`'s `exports` (Task 1.3/2.1's array) with `SaveDocumentService`, `PublishDocumentService`, `UnpublishDocumentService`, `DeleteDocumentService`. `schema-builder.service.ts`: emit `<Type>Input` (same scalar/media/component field shape as the object type, but input-typed — nested component inputs recurse the same way) and the 5 mutation signatures from SPEC.md's Generated-Schema section (`create`/`update`/`delete`/`publish`/`unpublish`).

**Acceptance criteria:**
- [ ] Generated SDL includes `input CvPageInput { ... }` and all 5 `Mutation.*CvPage` fields with correct arg/return types, matching SPEC.md exactly (`delete<Type>(Id: ID!): Boolean!`).

**Verification:** `schema-builder.service.spec.ts` extended, `document.module.spec.ts` extended — `bun run test:cov`.

**Dependencies:** Phase 3 complete.

**Files:** `src/modules/document/document.module.ts` (+spec), `src/modules/graphql/application/schema-builder.service.ts`.

**Scope:** M.

---

### Task 4.2 — Mutation resolvers + permission checks

**Description:** `resolver-factory.service.ts`: `create<Type>` → `assertApiTokenPermission(ctx, "document:create")` then `SaveDocumentService.execute(slug, data, undefined, apiToken.documentId)` (no re-read, matches REST's create — see the plan's Refinement 2). `update<Type>` → `assertApiTokenPermission(ctx, "document:update")`, `SaveDocumentService.execute(slug, data, Id, apiToken.documentId)`, **then** `GetDocumentForEditService.execute(slug, Id).then(r => r.document)` (re-read, per Refinement 2). `delete<Type>` → `assertApiTokenPermission(ctx, "document:delete")`, `DeleteDocumentService.execute(slug, Id)`, return `true` (catch `NotFoundException` → GraphQL `NOT_FOUND` error, not a silent `false`, since delete's REST equivalent 404s rather than no-ops). `publish<Type>`/`unpublish<Type>` → `assertApiTokenPermission` with `document:publish`/`document:unpublish`, delegate directly, propagate `BadRequestException` (Mode B) as a GraphQL `BAD_USER_INPUT` error.

**Acceptance criteria:**
- [ ] Each mutation, called with a correctly-scoped token, succeeds and returns the documented shape.
- [ ] Each mutation, called with a missing/wrong-scoped token, returns `UNAUTHENTICATED`/`FORBIDDEN`, never executes the underlying service call (assert via mock: service `execute` not called).
- [ ] `publish`/`unpublish` on a Mode-B (non-draft-to-publish) content type surfaces as a GraphQL error, not a 500.

**Verification:** `resolver-factory.service.spec.ts` extended — `bun run test:cov`.

**Dependencies:** Task 4.1.

**Files:** `src/modules/graphql/application/resolver-factory.service.ts` (+spec).

**Scope:** M.

---

### Task 4.3 — e2e: mutation coverage in `test/graphql.e2e-spec.ts`

**Description:** Extend Task 3.3's e2e file: full create → update → publish → unpublish → delete lifecycle for a throwaway `collection`-kind document, using tokens scoped with exactly the required permission per call (plus one under-scoped-token 403 case and one no-token 401 case per mutation type) — same shape as `content-engine.e2e-spec.ts`'s existing "Auth" section.

**Acceptance criteria:**
- [ ] Full lifecycle round-trips correctly against real Postgres; component/media data submitted via `create`/`update` persists and reads back correctly through the read-path queries from Phase 3.
- [ ] Every permission-denied case asserted.

**Verification:** `bun run test:e2e` green.

**Dependencies:** Task 4.2.

**Files:** `test/graphql.e2e-spec.ts`.

**Scope:** M.

---

### Checkpoint 4

- [ ] `bun run test:e2e` green.
- [ ] Manual: full CRUD lifecycle via `bun run start:dev` + a real access token.
- [ ] **Commit.**

---

## Phase 5 — Single-type support

### Task 5.1 — SDL + resolvers + exports for single-type

**Description:** Export the 5 single-type services (`GetSingleTypeService`, `SaveSingleTypeService`, `PublishSingleTypeService`, `UnpublishSingleTypeService`, `GetPublicSingleTypeService`) from `DocumentModule`. `schema-builder.service.ts`: handle `single`-kind definitions (skipped since Task 1.4) — `Query.<slug>(status: String): <Type>`, `Mutation.save<Type>`/`publish<Type>`/`unpublish<Type>` per SPEC.md (no `create`/`update`/`delete`/list — single-types have none). `resolver-factory.service.ts`: mirror Task 1.6/4.2's patterns using the single-type service set (no `Id` param anywhere).

**Acceptance criteria:**
- [ ] A throwaway `single`-kind content type (no real seed is single-kind) round-trips `save`/`publish`/`unpublish`/query (published + draft) exactly like the collection-type path, minus `Id`.

**Verification:** `schema-builder.service.spec.ts` / `resolver-factory.service.spec.ts` extended, `document.module.spec.ts` extended — `bun run test:cov`; e2e extension in `test/graphql.e2e-spec.ts` (throwaway single-type def, same in-memory `sync()` pattern).

**Dependencies:** Phase 4 complete.

**Files:** `src/modules/document/document.module.ts` (+spec), `src/modules/graphql/application/schema-builder.service.ts`, `src/modules/graphql/application/resolver-factory.service.ts`, `test/graphql.e2e-spec.ts`.

**Scope:** M.

---

### Checkpoint 5

- [ ] `bun run test:e2e` green (full suite, all kinds/operations).
- [ ] `bun run build` / `bunx tsc --noEmit` / `bun run lint` / `bun run test:cov` green.
- [ ] **Commit.**

---

## Phase 6 — Hardening

### Task 6.1 — Error-shape audit + five-axis review

**Description:** Audit every resolver/translator/context path for consistent `GraphQLError` codes (`UNAUTHENTICATED`/`FORBIDDEN`/`BAD_USER_INPUT`/`NOT_FOUND`) — no bare `Error`, no leaking a raw `NotFoundException`'s Nest-specific shape into a GraphQL response. Re-verify introspection/Playground gating end-to-end (Task 1.1's check, now against the full real schema). Run the mandatory five-axis review (`agent-skills:code-reviewer`) over the full diff; address Critical/Important findings.

**Acceptance criteria:**
- [ ] Every error path returns a consistent `{ errors: [{ message, extensions: { code } }] }` shape.
- [ ] Five-axis review: no unresolved Critical/Important findings.

**Verification:** `bun run test:cov`; review report.

**Dependencies:** Phase 5 complete.

**Files:** Touch-up only, no new files expected — whatever the audit/review surfaces.

**Scope:** M (bounded by whatever review finds; re-plan if it surfaces something L-sized).

---

### Checkpoint 6

- [ ] All automated checks green, review findings addressed.
- [ ] **Commit.**

---

## Phase 7 — Docs + close-out

### Task 7.1 — `docs/documents/graphql.md`, `SPEC.md` trim, cleanup

**Description:** Write `docs/documents/graphql.md` reflecting final shipped state (structure matches every other module doc: overview, entities/DTOs-equivalent SDL shapes, services/resolvers, endpoints, tests, known quirks — including the N+1 list-hydration trade-off and the two refinements from this plan's Context section). `docs/documents/graphql-techstack.md` already exists from the Spec phase — confirm it still matches what shipped, update if a decision changed during build. Trim `SPEC.md` back to a one-line pointer (matching every prior feature's close-out, e.g. the `rememberMe` precedent).

**Acceptance criteria:**
- [ ] `docs/ENTRYPOINT.md` gains a one-line index entry for `docs/documents/graphql.md` (matching every other module's entry format).
- [ ] `SPEC.md` is a pointer, no longer the active spec.

**Verification:** Doc read-through against shipped code (per `docs/rules/workflow.md`'s "Update docs" step).

**Dependencies:** Task 6.1.

**Files:** `docs/documents/graphql.md` (new), `docs/documents/graphql-techstack.md`, `docs/ENTRYPOINT.md`, `SPEC.md`.

**Scope:** S.

---

### Checkpoint 7 (final)

- [ ] All checks green.
- [ ] **Commit** — feature complete.

## Risks and Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| `@nestjs/graphql` `forRootAsync` timing assumption (factory resolves before `OnApplicationBootstrap`) turns out wrong in practice | High — would break the whole schema-timing fix | Task 1.1's boot-time manual verification catches this immediately, before any other phase builds on it |
| Recursive component SDL generation (Task 3.2) hits a naming collision at depth (two different content types sharing a component name) | Medium | `<ContentType><ComponentName>` prefixing (already in the naming scheme) avoids cross-content-type collisions; same-content-type nested reuse would need a uniqueness check — flag if the real seeds' shapes don't already prove this out in Task 3.2's tests |
| `ListDocumentsFullService`'s per-row component hydration N+1 becomes a real perf problem | Low at this repo's scale (documented, accepted trade-off, matches existing precedent) | Revisit only if list-endpoint latency becomes a concern, same threshold `document.md` already sets for `listPaginated`'s two-round-trip design |
| GraphQL error-shape consistency drifts across resolvers added in different phases | Medium | Task 6.1 is a dedicated audit pass specifically for this, not left to organic consistency |
