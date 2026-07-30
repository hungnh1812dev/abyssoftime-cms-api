# GraphQL Module

`src/modules/graphql/**` — a second, parallel API surface (`POST /graphql`, `@nestjs/graphql` schema-first + `@nestjs/apollo`) over the exact same [`content-type`](content-type.md)/[`document`](document.md)/[`media`](media.md) engine the REST API already exposes. The SDL (types, inputs, queries, mutations) is generated dynamically at boot from `content-types/*.json` — zero hand-written per-content-type resolver code, and every resolver delegates straight to an existing, already-tested `document`/`content-type` usecase service. The module owns zero business logic, zero Prisma/SQL access, and zero new database tables/columns. See `docs/documents/graphql-techstack.md` for the three tech-stack decisions (runtime choice, schema-build timing fix, auth transport) confirmed during the Spec phase — all three shipped as decided.

Ported from a Go/GORM-derived source design (`docs/graphql.md`); deviations are called out inline below, matching the pattern `content-type.md`/`document.md` use for their own source docs. The two biggest: no `locale` anywhere (repo-wide deviation, same as every other module), and the response shape has **no `data` wrapper** — a nullable object for single queries, `[Type!]!` for list queries — since the source doc's own later changelog entries (v1.13/v1.14) supersede its earlier wrapped-shape examples.

## Schema-build timing

`GraphQLModule.forRootAsync`'s `useFactory` resolves during Nest's module-init phase — *before* `ContentTypeSyncService.onApplicationBootstrap()` reconciles `content-types/*.json` into Postgres. Reading `CONTENT_TYPE_REPOSITORY` here would race an empty/stale table on a cold boot. Instead, `SchemaBuilderService`/`ResolverFactoryService` both read `content-types/*.json` directly via `ContentTypeModule`'s `SchemaLoaderService` (made public via an additive export) — the same source of truth the sync engine itself reads, no ordering dependency at all. One consequence: **the GraphQL schema is a snapshot of disk at boot time**, not the live DB — a content type deleted from the DB without a reboot (or without its JSON file removed) still exists in the GraphQL schema until the next restart; `resolver-factory.service.ts`'s error mapping (see [Error mapping](#error-mapping) below) turns that drift into a normal `NOT_FOUND` GraphQL error rather than a crash, but it doesn't disappear from introspection until reboot.

## Field type mapping

`domain/field-type-mapping.ts` — `graphqlTypeFor(field): string | null` (`null` for `component`, handled separately by the recursive nested-type builders below):

| Content-type `type` | GraphQL type |
| --- | --- |
| `text` | `String` |
| `richtext` | `String` |
| `number` | `Float` |
| `boolean` | `Boolean` |
| `media` | `MediaAsset` object — `{ documentId, url, thumbnailUrl, fileName, width, height }`, one shared type emitted once regardless of how many content types reference it |
| `json` | `JSON` scalar (`domain/json-scalar.ts`'s `JSONScalar`, emitted once) — passes through as-is; `parseLiteral` reconstructs objects/arrays/primitives from the AST for inline query literals |
| `component` | Nested object type, `<ContentType><ComponentName>` PascalCase, recursively resolved to arbitrary nesting depth |

## Naming conventions

`domain/naming.ts`, pure `slug -> name` derivation functions, unchanged from the source doc:

| Function | Example (`cv-page`) |
| --- | --- |
| `typeName` | `CvPage` |
| `queryName` | `cvPage` |
| `listQueryName` | `cvPageList` |
| `inputTypeName` | `CvPageInput` |
| `filterTypeName` | `CvPageFilter` |
| `orderByTypeName` | `CvPageOrderBy` |
| `componentTypeName(slug, component)` | `CvPageSkill` |
| `componentInputTypeName(slug, component)` | `CvPageSkillInput` |
| `createMutationName` / `updateMutationName` / `deleteMutationName` / `publishMutationName` / `unpublishMutationName` | `createCvPage` / `updateCvPage` / `deleteCvPage` / `publishCvPage` / `unpublishCvPage` |
| `saveMutationName` (single-type only) | `saveCvPage` |

## Generated schema per content-type

`application/schema-builder.service.ts` — `SchemaBuilderService.buildTypeDefs()`, called once at boot; builds the whole SDL as one string from `SchemaLoaderService.load()`'s `ContentTypeDefinition[]`, branching on `kind`.

**Collection-type** (both real seeds, `cv-page`/`en-it-vocab`, are `collection`-kind):

- `Query.<slug>(Id: ID!, status: String): <Type>` — nullable; omitted/anything-but-`"draft"` `status` reads published, `status: "draft"` requires a `document:read`-scoped token.
- `Query.<slug>List(where: <Type>Filter, orderBy: <Type>OrderBy, start: Int, size: Int): [<Type>!]!` — always published-only, no `status` arg at all (matches the source doc: list has no draft concept).
- `Mutation.create<Type>(data: <Type>Input!): <Type>!` — `document:create`.
- `Mutation.update<Type>(Id: ID!, data: <Type>Input!): <Type>!` — `document:update`.
- `Mutation.delete<Type>(Id: ID!): Boolean!` — `document:delete`.
- `Mutation.publish<Type>(Id: ID!): <Type>!` — `document:publish`, `BAD_USER_INPUT` in Mode B.
- `Mutation.unpublish<Type>(Id: ID!): <Type>!` — `document:unpublish`, `BAD_USER_INPUT` in Mode B.

**Single-type** (no real seed; proven via a throwaway e2e content type — see [Tests](#tests)):

- `Query.<slug>(status: String): <Type>` — nullable, no `Id` param.
- `Mutation.save<Type>(data: <Type>Input!): <Type>!` — `document:update`. No `create`/`update`/`delete` — a single type has at most one entry, created on first save.
- `Mutation.publish<Type>: <Type>!` / `Mutation.unpublish<Type>: <Type>!` — no args at all.

**`<Type>Input`** mirrors the object type's shape: media fields submit as the target asset's `ID` (an input type can't reference an output type like `MediaAsset`), a repeatable component field is a nullable `[<Component>Input!]` (nullable, unlike the object type's always-real `[X!]!` array — a client submitting a partial input must not be forced to also submit every other repeatable component as an empty array). Every object/input type also recursively emits one nested type per unique component encountered, first-seen order, deduplicated by name.

**`<Type>Filter`/`<Type>OrderBy`** (collection-type only — single types have no list query, so no filter/orderBy input is emitted for them): one field per *listable* scalar (`text`/`number`/`boolean` — `richtext`/`json`/`media`/`component` are never filterable/sortable in v1), typed `TextFilter`/`NumberFilter`/`BooleanFilter` (three shared input types, emitted once) or `SortDirection` (shared enum, `ASC`/`DESC`). `OrderBy` additionally always includes the three system timestamps (`createdAt`/`updatedAt`/`publishedAt`).

## Filtering & sorting

`application/list-args.translator.ts` — `translateListArgs(contentType, args): FullListOptions`, called by every `<slug>List` resolver:

| Field type | v1 operators | 
| --- | --- |
| `text` | `eq`, `ne`, `contains` |
| `number` | `eq`, `ne`, `gt`, `gte`, `lt`, `lte` |
| `boolean` | `eq` |

Matches REST's existing `where-builder.ts` operator set exactly — `startsWith`/`endsWith`/`in` and top-level `AND`/`OR`/`NOT` are an explicit v1 deferral (would require editing `document`'s tested filter internals), not shipped. An unknown filter field, an operator illegal for that field's type, an unknown `orderBy` field, or a **multi-field `orderBy`** (v1 supports exactly one sort field — a multi-key input used to silently apply only the first key and drop the rest; now rejected outright, see [Post-review hardening](#post-review-hardening)) all throw `BAD_USER_INPUT`, never silently coerced or ignored. `start`/`size` default `0`/`20`, `size` capped at `100`. `createdAt`/`updatedAt`/`publishedAt` alias to their raw snake_case columns internally; no `search` arg in v1 (source doc's GraphQL list query has none either).

## Resolvers

`application/resolver-factory.service.ts` — `ResolverFactoryService.buildResolvers()`, called once at boot alongside `buildTypeDefs()`; builds the full `{ Query, Mutation, SortDirection, JSON, <TypeName>: { <mediaField>: resolver } }` map. One loop over every `collection`-kind definition, one over every `single`-kind definition — each registers its own `Query`/`Mutation` fields plus, recursively, a field resolver for every `media`-typed field at any nesting depth (`collectMediaFieldResolvers`, walks the component tree once per content type).

- **Single-item query** — `status !== "draft"` delegates to `GetPublicDocumentService`/`GetPublicSingleTypeService`; `status: "draft"` asserts `document:read` then delegates to `GetDocumentForEditService`/`GetSingleTypeService`. Either way, a `NotFoundException` from the service resolves to GraphQL `null` (`resolveOrNull`) — a nonexistent document is a nullable field, not an error, matching REST's 404-vs-null-field distinction.
- **List query** — `translateListArgs` then `ListDocumentsFullService.execute` (a new `document`-module service — REST's own `ListDocumentsService` projects to `contentType.listFields`, which would silently null out any field a GraphQL client selects outside that admin-list-view allowlist; the new service returns full hydrated rows instead, published-only, no per-row status computation — simpler than the source doc implied, since list has no `status` arg at all).
- **Media field resolver** — `parent[field.name]` (the raw FK) → `MEDIA_ASSET_REPOSITORY.findByDocumentId`; a `null`/missing FK or a dangling (deleted) asset both resolve to `null`, never throw.
- **Mutations** — `assertApiTokenPermission` first, then delegate. `create<Type>` doesn't re-read (its return value is already the fresh entity — a newly created document can never already have an older published counterpart). `update<Type>`/`save<Type>`/`unpublish<Type>` all **re-read after the write** (`GetDocumentForEditService`/`GetSingleTypeService`), mirroring REST's own `PUT`/`unpublish` routes — the service's own return value is either an unhydrated echo of the input (`SaveDocumentService`) or doesn't reflect the correctly recomputed status, so a raw echo would be wrong. `publish<Type>` doesn't re-read — its return value is already the freshly published entity.
- **Every resolver attaches `documentId`** (`toResolverValue`) even though it isn't a schema-defined content field — without it, a client creating a document has no way to learn its new id.

## Auth

`application/graphql-context.factory.ts` — `GraphqlContextFactory.createContext(request): Promise<{ apiToken: ApiTokenPayload | null }>`, wired as Apollo's per-request `context` function. Reuses `ApiTokenGuard`'s own verification steps (`access-tokens` module: SHA-256 hash lookup, expiry check) rather than the guard class itself — Apollo's `context` function isn't a Nest route, so `@UseGuards` can't attach to it directly. **Never throws** — a missing header, malformed header (no `Bearer ` prefix), unknown hash, or expired token all resolve to `{ apiToken: null }`, letting every resolver decide for itself whether that's acceptable (public reads) or not (draft reads, all mutations).

`application/authorize.util.ts` — `assertApiTokenPermission(context, slug)`: throws `GraphQLError` with `extensions.code: "UNAUTHENTICATED"` if `context.apiToken` is `null`, `"FORBIDDEN"` if the token exists but lacks `slug` in its `permissions` array. Reuses the exact same `document:*` permission slugs REST already seeds (`document:read`/`create`/`update`/`delete`/`publish`/`unpublish`) — no new slugs were added for this feature.

## Error mapping

`resolver-factory.service.ts`'s `withErrorMapping(run)` wraps every mutation and the list query (originally mutation-only; extended to the list query during Phase 6 hardening — see below): catches `NotFoundException` → `GraphQLError` with `extensions.code: "NOT_FOUND"`, `BadRequestException` (e.g. `assertDraftPublishEnabled`'s Mode B guard) → `"BAD_USER_INPUT"`. `assertValidDocumentId` (a `class-validator` `isUUID` check on every `Id` arg) throws `"BAD_USER_INPUT"` directly, before any service call. `list-args.translator.ts`'s own `badUserInput()` helper does the same for filter/orderBy/pagination validation.

`application/format-error.util.ts` — `formatGraphqlError`, wired as Apollo's `formatError`. Any error whose `extensions.code` isn't in an explicit safe-list (the four codes above, plus graphql-js/Apollo's own request-level codes — parse/validation failures, introspection-disabled, persisted-query codes) gets replaced with a generic `"Internal server error"` / `INTERNAL_SERVER_ERROR`, dropping the original message entirely — a defense-in-depth backstop against any error that slips past the explicit mapping above (a raw Prisma/driver exception, for instance) ever reaching a client with an internal detail in its `.message`. `@nestjs/apollo`'s own `autoTransformHttpErrors` (on by default) runs first and maps a handful of `HttpException` statuses to Apollo codes of its own — `401`/`403` map to `UNAUTHENTICATED`/`FORBIDDEN` (compatible with this module's own codes), but `400`/`404` map to `BAD_REQUEST`/nothing-at-all (falls through to `INTERNAL_SERVER_ERROR`) rather than this module's `BAD_USER_INPUT`/`NOT_FOUND` — which is exactly why every resolver wraps its own errors explicitly rather than relying on that framework default.

## Introspection/Playground gating

`graphql.module.ts`: `introspection`/`playground` both gated `process.env.NODE_ENV !== "production"` (SPEC.md decision #6 — a public schema dump reveals every content type's shape to unauthenticated probing). A deliberate deny-list, not an allow-list: fails open if `NODE_ENV` is ever unset, a trade-off accepted as-is during Phase 6's five-axis review since real deployments consistently set `NODE_ENV=production` explicitly and this repo has no other precedent for a stricter env-flag pattern. Verified two ways: a unit test that actually flips `process.env.NODE_ENV` to `"production"` and confirms both flags become `false` (not just a passthrough-of-whatever-env-happens-to-be-set check), and an e2e introspection query against the full generated schema (all real + throwaway content types) proving the wiring reaches Apollo Server for real, not just Task 1's original placeholder `_empty` schema.

## Module wiring

`graphql.module.ts` — `GraphQLModule.forRootAsync<ApolloDriverConfig>({ imports: [ContentTypeModule, DocumentModule, AccessTokenModule, MediaModule], driver: ApolloDriver, inject: [...15 services/tokens...], useFactory })`. The factory constructs `SchemaBuilderService`/`ResolverFactoryService`/`GraphqlContextFactory` directly (plain `new`, not DI-resolved — they're built once per boot from injected dependencies, not registered as their own providers) and returns `{ typeDefs, resolvers, introspection, playground, context, formatError }`. Registered in `src/app.module.ts` after `DocumentModule`. `GraphqlModule` has no `providers`/`controllers` of its own — every dependency it needs comes through the four imported modules' existing exports.

**Additive-only changes to existing modules** (per SPEC.md's boundary — no other module's internal logic touched):

- `ContentTypeModule` — exports `SchemaLoaderService` (was module-private).
- `DocumentModule` — gained an `exports:` array (had none): `GetPublicDocumentService`, `GetDocumentForEditService`, `ListDocumentsFullService`, `SaveDocumentService`, `PublishDocumentService`, `UnpublishDocumentService`, `DeleteDocumentService`, `GetSingleTypeService`, `SaveSingleTypeService`, `PublishSingleTypeService`, `UnpublishSingleTypeService`, `GetPublicSingleTypeService`.
- `MediaModule` — gained an `exports:` array (had none): `MEDIA_ASSET_REPOSITORY`.

## Tests

Unit tests (Jest, `Test.createTestingModule` + `useValue` mocks or plain `new` construction, colocated `*.spec.ts`) — 10 spec files: `field-type-mapping.spec.ts`, `naming.spec.ts`, `json-scalar.spec.ts` (domain, pure functions); `schema-builder.service.spec.ts` (SDL generation per field type, both kinds, deterministic-ordering across repeated calls, shared types emitted exactly once), `resolver-factory.service.spec.ts` (resolver delegation with exact-args assertions for every query/mutation across both kinds, media-field resolution incl. dangling/null FK, permission-required/wrong-scope/missing-token branches per mutation, error-code mapping), `list-args.translator.spec.ts` (parity with REST's filter/orderBy semantics, every validation-rejection path), `authorize.util.spec.ts`, `graphql-context.factory.spec.ts` (missing/malformed/unknown/expired/valid/never-expiring token branches, mirrors `api-token.guard.spec.ts`'s own coverage), `format-error.util.spec.ts` (safe-code passthrough, unmapped-error replacement, original message never present in the output), `graphql.module.spec.ts` (DI wiring, real `typeDefs`/resolvers built via the real `useFactory`, the introspection-flip behavioral test, `formatError` wiring).

e2e (`test/graphql.e2e-spec.ts`, real Postgres, `bootTestApp` — same infra `content-engine.e2e-spec.ts` uses): single/list queries against real `cv-page` data (published/draft, with/without token); 3-level nested component read with a `json`-typed array field; a throwaway media-bearing collection-type content type (file written to `content-types/` before boot, so it's a real part of the generated schema) proving media FK resolution including the null-FK case; full collection-type CRUD+publish+unpublish lifecycle plus every mutation's permission-denied (missing/wrong-scoped token) case; a throwaway single-type content type proving the full save→publish→unpublish lifecycle with no `Id` anywhere, plus its own permission-denied cases; a real introspection query against the full generated schema. Both throwaway content types are torn down in `afterAll` via `syncService.sync(realDefs)` — the same code path the boot process itself uses.

Per project rule, no `coverageThreshold` entries were added — this module has no Prisma repository or controller-shaped files (it's pure application logic delegating to already-covered `document`/`content-type`/`media` services), so normal per-file thresholds apply everywhere.

## Known quirks / accepted trade-offs

- **List-query hydration is N+1 across a page, not batched.** `ListDocumentsFullService` hydrates each row's components/media independently (no `DataLoader`, no cross-row batching) — a page of `size: 100` with nested components issues up to 100× the component-table queries a batched loader would need. Flagged during Phase 6's five-axis review and accepted as a known, same-category trade-off this repo already lives with elsewhere (e.g. `listPaginated`'s own two-round-trip count+data query) — not a blocker for this repo's scale, revisit only if it becomes a measured problem under real load.
- **`resolveOrNull` collapses two distinct causes into the same `null`.** A single-item query resolves to `null` both when the specific document doesn't exist *and* when the owning content type itself is missing from the DB (schema/DB drift — see [Schema-build timing](#schema-build-timing)). This is Task 1's original, deliberate, tested design (a REST 404 maps to a nullable GraphQL field, not an error) — not a gap the way the list query's *complete absence* of error mapping was (fixed, see below). Distinguishing the two causes cleanly would require a dedicated error type crossing the `content-type`/`document` module boundary, judged out of proportion to how rare the drift scenario actually is in practice (disk and DB are reconciled on every boot).
- **`orderBy` accepts exactly one field.** The generated `<Type>OrderBy` input type structurally allows a client to pass multiple fields (it's a plain object with one optional field per sortable column), but `translateListArgs` only ever honors one — passing more than one now throws `BAD_USER_INPUT` (see [Post-review hardening](#post-review-hardening); it used to silently apply only the first and drop the rest).
- **No query depth/complexity limiting.** Only list `size` is capped (`100`); an arbitrarily deep nested-component query has no cost limit. Flagged as a suggestion during review, not pursued — would be a new cross-cutting decision (a complexity-scoring library, a max-depth rule) outside this feature's scope, not a fix-in-place.

## Post-review hardening

A five-axis code review (`agent-skills:code-reviewer`) over this feature's full diff (Phases 1–6) flagged one real correctness gap and one real hardening gap, both fixed; a handful of other findings were considered and deliberately left as-is (see [Known quirks](#known-quirks--accepted-trade-offs) above and the introspection note in [Introspection/Playground gating](#introspectionplayground-gating)):

1. **The list-query resolver had no error mapping at all** (unlike every other resolver) — a `NotFoundException` from `ListDocumentsFullService` (the schema/DB-drift scenario) would propagate raw, and `@nestjs/apollo`'s own `autoTransformHttpErrors` default doesn't map a 404 to anything meaningful (falls through to `INTERNAL_SERVER_ERROR`). Fixed by wrapping the list query in the same `withErrorMapping` helper every mutation already used (renamed from `withMutationErrorMapping`, since it's no longer mutation-only).
2. **No `formatError` configured** — any error that slipped past the explicit `NotFoundException`/`BadRequestException` mapping (a raw Prisma/driver exception, for instance) would reach the client with its real `.message` intact, since Apollo Server v5 doesn't redact error messages by default. Fixed with `format-error.util.ts`'s safe-code whitelist (see [Error mapping](#error-mapping) above).

Also addressed alongside the review (found during the same audit pass, same root cause as finding 1 — "no validation, silent wrong behavior"): `resolveOrderBy`'s silent multi-field drop (see [Known quirks](#known-quirks--accepted-trade-offs)), and two missing FORBIDDEN-token test cases (`saveHomePage`/`unpublishHomePage` in the single-type resolver spec, which had every other permission branch covered but those two).

## Verified state

`bun run build`, `bunx tsc --noEmit`, `bun run lint`, and `bun run test:cov` all pass (134 suites, 891 tests repo-wide, including every spec listed under [Tests](#tests) above). `bun run test:e2e` is green across all four e2e suites together (47 tests), including `graphql.e2e-spec.ts`'s 25 — full collection-type and single-type lifecycles, nested component + media resolution, permission-denied paths, and the introspection query — against a real reachable Postgres. A five-axis review ran over the complete feature diff (Phases 1–6) with both real findings fixed, confirmed by the same full check suite passing again afterward.
