# GraphQL Module

`src/modules/graphql/**` — a second, parallel API surface (`POST /graphql`, `@nestjs/graphql` schema-first + `@nestjs/apollo`) over the exact same [`content-type`](content-type.md)/[`document`](document.md)/[`media`](media.md) engine the REST API already exposes. The SDL (types, inputs, queries, mutations) is generated dynamically at boot from `content-types/*.json` — zero hand-written per-content-type resolver code, and every resolver delegates straight to an existing, already-tested `document`/`content-type` usecase service. The module owns zero business logic, zero Prisma/SQL access, and zero new database tables/columns. See `docs/documents/graphql-techstack.md` for the three tech-stack decisions (runtime choice, schema-build timing fix, auth transport) confirmed during the Spec phase — all three shipped as decided.

Ported from a Go/GORM-derived source design (`docs/graphql.md`, plus a second later reference port at `docs/golang/{graphql.md,graphql-list-api-spec.md,guide.md}` used for the Contract Parity Pass below); deviations are called out inline, matching the pattern `content-type.md`/`document.md` use for their own source docs. The two biggest ongoing deviations: no `locale` anywhere (repo-wide, same as every other module), and the response shape has **no `data` wrapper** on single-item queries — a nullable object, not the source's wrapped shape.

### GraphQL Contract Parity Pass

A later cycle (`SPEC.md` at the time, since folded back into this doc) closed nine naming/shape gaps between this module and the Go reference port, confirmed as straight breaking renames since no real consumer (`cms-admin`) touches `/graphql` yet:

1. List query names are pluralized (`blogPostList` → `blogPosts`), not singular+`List`.
2. Every `Id` arg (single query + all 4 CRUD mutations) is `documentId`, not `Id`.
3. List queries return an envelope (`<Type>List! { items, meta { pagination { page, pageSize, total } } }`), never a bare array.
4. Pagination is a `PaginationInput` (`start`/`limit` offset mode **or** `page`/`pageSize` page mode, full 13-rule validation, `limit: -1` = unlimited), replacing flat `start`/`size`.
5. `TextFilter`/`NumberFilter` gained `in`/`notIn`; new `IDFilter` (`eq`/`ne`/`in`/`notIn`) and `TimeFilter` (`eq`/`ne`).
6. `<Type>Filter` gained self-referencing `and`/`or`/`not` combinators — still reached only through the existing `where` arg, never a separate `filters:` array.
7. `<Type>Filter` gained `documentId`/`createdAt`/`updatedAt`/`publishedAt` system-field filters.
8. Default sort (no `orderBy`, or all-null) changed from `id DESC` to `createdAt DESC`; the existing multi-field-`orderBy`-throws hardening is unchanged.
9. Every generated `<Type>` gained `createdAt`/`updatedAt`/`publishedAt: DateTime` fields via a new `DateTime` scalar.

Deliberately **not** changed: `locale`, the auth model, `formatError`/error-code shape, media/component handling, and `contains`-only-on-text (the union of REST's + Go's operators was kept, not strict Go parity) — see [Known quirks](#known-quirks--accepted-trade-offs) for why these were kept as deviations rather than "fixed."

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
| `listQueryName` | `cvPages` (pluralized: append `es` if the singular ends in `s`/`x`/`z`/`ch`/`sh`, else `s` — `listQueryName("en-it-vocab")` → `enItVocabs`) |
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

- `Query.<slug>(documentId: ID!, status: String): <Type>` — nullable; requires a `document:read`-scoped token regardless of `status` — omitted/anything-but-`"draft"` `status` reads published, `status: "draft"` reads the edit view.
- `Query.<pluralSlug>(where: <Type>Filter, orderBy: <Type>OrderBy, pagination: PaginationInput): <Type>List!` — requires a `document:read`-scoped token; always published-only, no `status` arg at all (matches the source doc: list has no draft concept). Never a bare array — always the `{ items, meta }` envelope (see [List envelope & pagination](#list-envelope--pagination) below).
- `Mutation.create<Type>(data: <Type>Input!): <Type>!` — `document:create`.
- `Mutation.update<Type>(documentId: ID!, data: <Type>Input!): <Type>!` — `document:update`.
- `Mutation.delete<Type>(documentId: ID!): Boolean!` — `document:delete`.
- `Mutation.publish<Type>(documentId: ID!): <Type>!` — `document:publish`, `BAD_USER_INPUT` in Mode B.
- `Mutation.unpublish<Type>(documentId: ID!): <Type>!` — `document:unpublish`, `BAD_USER_INPUT` in Mode B.

**Single-type** (no real seed; proven via a throwaway e2e content type — see [Tests](#tests)):

- `Query.<slug>(status: String): <Type>` — nullable, no `documentId` param; requires a `document:read`-scoped token regardless of `status`, same as the collection-type query.
- `Mutation.save<Type>(data: <Type>Input!): <Type>!` — `document:update`. No `create`/`update`/`delete` — a single type has at most one entry, created on first save.
- `Mutation.publish<Type>: <Type>!` / `Mutation.unpublish<Type>: <Type>!` — no args at all.

**`<Type>Input`** mirrors the object type's shape: media fields submit as the target asset's `ID` (an input type can't reference an output type like `MediaAsset`), a repeatable component field is a nullable `[<Component>Input!]` (nullable, unlike the object type's always-real `[X!]!` array — a client submitting a partial input must not be forced to also submit every other repeatable component as an empty array). Every object/input type also recursively emits one nested type per unique component encountered, first-seen order, deduplicated by name.

Every generated `<Type>` also carries `createdAt: DateTime!`, `updatedAt: DateTime!`, `publishedAt: DateTime` (nullable — never set until first publish) alongside `documentId` and the content fields — via `domain/date-time-scalar.ts`'s `DateTimeScalar` (ISO-8601 string, serializes a real `Date`, rejects invalid dates/strings with `BAD_USER_INPUT` at either parse or serialize time).

**`<Type>Filter`/`<Type>OrderBy`** (collection-type only — single types have no list query, so no filter/orderBy input is emitted for them):

- One field per *listable* content scalar (`text`/`number`/`boolean` — `richtext`/`json`/`media`/`component` are never filterable/sortable in v1), typed `TextFilter`/`NumberFilter`/`BooleanFilter`.
- `TextFilter`: `eq`/`ne`/`contains`/`in`/`notIn`. `NumberFilter`: `eq`/`ne`/`gt`/`gte`/`lt`/`lte`/`in`/`notIn`. `BooleanFilter`: `eq`/`ne`. These three are shared input types, emitted once.
- Four system-field filters prepended ahead of the content fields on every `<Type>Filter`: `documentId: IDFilter` (`eq`/`ne`/`in`/`notIn`), `createdAt`/`updatedAt`/`publishedAt: TimeFilter` (`eq`/`ne` only) — `IDFilter`/`TimeFilter` are also shared, emitted once.
- Self-referencing combinators `and: [<Type>Filter!]`, `or: [<Type>Filter!]`, `not: <Type>Filter` — nest to unbounded depth, reached only through the existing `where` arg (never a separate `filters:` array). Every non-null field at one level (direct conditions and `and`/`or`/`not` alike) is implicitly ANDed together.
- `OrderBy` additionally always includes the three system timestamps (`createdAt`/`updatedAt`/`publishedAt`); still exactly one non-null field accepted (see [Filtering & sorting](#filtering--sorting)).

## List envelope & pagination

Every list query returns `<Type>List! { items: [<Type>!]!, meta: ListMeta! }` where `ListMeta { pagination: PaginationMeta! }` and `PaginationMeta { page: Int!, pageSize: Int!, total: Int! }` (all three shared types, emitted once alongside the per-field-kind filter inputs).

`pagination: PaginationInput { start, limit, page, pageSize }` (all nullable) replaces the old flat `start`/`size` args — offset mode (`start`/`limit`) and page mode (`page`/`pageSize`) are mutually exclusive. `list-args.translator.ts`'s `resolvePagination` validates in this exact order:

| # | Condition | Result |
| --- | --- | --- |
| 1 | `pagination` omitted | `start = 0, limit = 10` |
| 2 | both offset and page fields set | `BAD_USER_INPUT`: `"cannot mix offset (start/limit) and page (page/pageSize) modes"` |
| 3 | only one of `page`/`pageSize` set | `BAD_USER_INPUT`: `"page and pageSize must both be provided"` |
| 4 | `page < 1` | `BAD_USER_INPUT`: `"page must be >= 1"` |
| 5 | `pageSize == 0` | `BAD_USER_INPUT`: `"pageSize must not be 0"` |
| 6 | valid page mode | `pageSize = min(pageSize, 100)`; `start = (page-1)*pageSize`; `limit = pageSize` |
| 7 | offset mode, `start` omitted | `start = 0` |
| 8 | offset mode, `start < 0` | clamp to `0` (no error) |
| 9 | offset mode, `limit` omitted | `limit = 10` |
| 10 | offset mode, `limit == 0` | `BAD_USER_INPUT`: `"limit must not be 0"` |
| 11 | offset mode, `limit == -1` | unlimited — every matching row, `LIMIT` omitted from the SQL entirely (Postgres rejects a negative `LIMIT`; see `prisma-document.repository.ts`'s `listPaginated`) |
| 12 | offset mode, `limit > 100` | clamp to `100` |
| 13 | offset mode, `0 < limit <= 100` | used as-is |

Default `limit` when `pagination` is omitted is **10**, a deliberate change from the pre-parity-pass default of `20` (matches the Go reference; not an oversight). `resolver-factory.service.ts`'s `buildPaginationMeta(start, size, total)` computes the response `page`/`pageSize` *after* resolution — `size === -1` reports `page: 1, pageSize: total`, otherwise `page = floor(start/size) + 1, pageSize = size`. `total` always counts every row matching `where`, independent of pagination.

## Filtering & sorting

`application/list-args.translator.ts` — `translateListArgs(contentType, args): FullListOptions`, called by every `<pluralSlug>` resolver:

| Field type | Operators |
| --- | --- |
| `text` | `eq`, `ne`, `contains`, `in`, `notIn` |
| `number` | `eq`, `ne`, `gt`, `gte`, `lt`, `lte`, `in`, `notIn` |
| `boolean` | `eq`, `ne` |
| `documentId` (system) | `eq`, `ne`, `in`, `notIn` (via `IDFilter`) |
| `createdAt`/`updatedAt`/`publishedAt` (system) | `eq`, `ne` (via `TimeFilter`) |

A superset of REST's own `where-builder.ts` operator set, not strict Go parity — `contains` stays on `text` alongside the new `in`/`notIn` (Go doesn't have `contains`), and boolean has full REST parity (`eq`/`ne`). `startsWith`/`endsWith` remain an explicit deferral. An unknown filter field, an operator illegal for that field's type, an unknown `orderBy` field, or a **multi-field `orderBy`** (still exactly one sort field accepted — a multi-key input throws rather than silently applying only the first key, see [Post-review hardening](#post-review-hardening)) all throw `BAD_USER_INPUT`, never silently coerced or ignored. `createdAt`/`updatedAt`/`publishedAt`/`documentId` alias to their raw snake_case columns (`created_at`/`updated_at`/`published_at`/`document_id`) internally; no `search` arg in v1 (source doc's GraphQL list query has none either).

**Default sort** (no `orderBy`, or every field null): `createdAt DESC` — changed from the pre-parity-pass `id DESC` to match the Go reference. The existing hardening (throws `BAD_USER_INPUT` on more than one non-null `orderBy` field) is otherwise unchanged.

**Combinators (`and`/`or`/`not`):** `resolveFilterNode` recurses through `where` — `and`/`or` map to an array of nested `WhereInput`s, `not` to a single nested one, any other key is a leaf field condition (resolved via `resolveFieldLeaves` into one `ParsedFilter` per operator). One code path handles both a flat field-only `where` and a full combinator tree, always collapsing to a single root `FilterNode` (or `undefined` for an empty/no-op `where`) — `and`/`or`/`not` nesting is unbounded in this pass, no depth limit. The resolved tree is threaded through as `FullListOptions.filterTree`, additive alongside the always-empty `filters: []` GraphQL now passes (GraphQL routes every condition, system or content, leaf or combinator, through the tree — see `document.md`'s [Filter combinators](document.md#filter-combinators-additive-graphql-only) for the shared SQL-builder side of this).

## Resolvers

`application/resolver-factory.service.ts` — `ResolverFactoryService.buildResolvers()`, called once at boot alongside `buildTypeDefs()`; builds the full `{ Query, Mutation, SortDirection, JSON, <TypeName>: { <mediaField>: resolver } }` map. One loop over every `collection`-kind definition, one over every `single`-kind definition — each registers its own `Query`/`Mutation` fields plus, recursively, a field resolver for every `media`-typed field at any nesting depth (`collectMediaFieldResolvers`, walks the component tree once per content type).

- **Single-item query** — asserts `document:read` (scoped to `definition.slug`, see [Auth](#auth) below) unconditionally (hoisted above the `status` branch — no exception for published data), then `status !== "draft"` delegates to `GetPublicDocumentService`/`GetPublicSingleTypeService`; `status: "draft"` delegates to `GetDocumentForEditService`/`GetSingleTypeService`. Either way, a `NotFoundException` from the service resolves to GraphQL `null` (`resolveOrNull`) — a nonexistent document is a nullable field, not an error, matching REST's 404-vs-null-field distinction.
- **List query** — asserts `document:read` (scoped to `definition.slug`) first (before `translateListArgs`, matching the single-item query), then `translateListArgs` then `ListDocumentsFullService.execute` (a `document`-module service — REST's own `ListDocumentsService` projects to `contentType.listFields`, which would silently null out any field a GraphQL client selects outside that admin-list-view allowlist; this service returns full hydrated rows instead, published-only, no per-row status computation — simpler than the source doc implied, since list has no `status` arg at all). The resolver wraps the result into the envelope itself: `{ items: result.items, meta: { pagination: buildPaginationMeta(options.start, options.size, result.total) } }` — `ListDocumentsFullService`/`FullListOptions` don't know about the GraphQL-shaped envelope, only `start`/`size`/`total`.
- **Media field resolver** — `parent[field.name]` (the raw FK) → `context.mediaAssetLoader.load(fk)`; a `null`/missing FK or a dangling (deleted) asset both resolve to `null`, never throw. The loader batches every `load` call issued within the same tick into one `MEDIA_ASSET_REPOSITORY.findByDocumentIds` call (see [Auth](#auth) below for where the loader is built) — fixes what was previously one `findByDocumentId` query per object in a list result (N+1).
- **Mutations** — `assertApiTokenPermission` first (scoped to `definition.slug`), then delegate. `create<Type>` doesn't re-read (its return value is already the fresh entity — a newly created document can never already have an older published counterpart). `update<Type>`/`save<Type>`/`unpublish<Type>` all **re-read after the write** (`GetDocumentForEditService`/`GetSingleTypeService`), mirroring REST's own `PUT`/`unpublish` routes — the service's own return value is either an unhydrated echo of the input (`SaveDocumentService`) or doesn't reflect the correctly recomputed status, so a raw echo would be wrong. `publish<Type>` doesn't re-read — its return value is already the freshly published entity.
- Every one of these 11 call sites (`resolver-factory.service.ts`) already has `definition.slug` in closure scope, so passing it through as the third `assertApiTokenPermission` argument required no new plumbing.
- **Every resolver attaches `documentId`** (`toResolverValue`) even though it isn't a schema-defined content field — without it, a client creating a document has no way to learn its new id.

## Auth

`application/graphql-context.factory.ts` — `GraphqlContextFactory.createContext(request): Promise<GraphqlContext>` (`GraphqlContext = { apiToken: ApiTokenPayload | null; mediaAssetLoader: DataLoader<string, MediaAssetEntity | null> }`), wired as Apollo's per-request `context` function. Reuses `ApiTokenGuard`'s own verification steps (`access-tokens` module: SHA-256 hash lookup, expiry check) rather than the guard class itself — Apollo's `context` function isn't a Nest route, so `@UseGuards` can't attach to it directly. **Never throws** — a missing header, malformed header (no `Bearer ` prefix), unknown hash, or expired token all resolve to `{ apiToken: null, mediaAssetLoader }`, letting every resolver decide for itself whether that's acceptable (public reads) or not (draft reads, all mutations).

Every `createContext()` call also builds a **fresh** `mediaAssetLoader` — a `DataLoader` instance is never shared or cached across requests, since that would leak values and grow unbounded. The batch function calls `MEDIA_ASSET_REPOSITORY.findByDocumentIds`, mapping results back to the input key order (missing ids → `null`, never a thrown/rejected entry, per DataLoader's contract). This is what powers the media field resolver's batching described above.

`application/authorize.util.ts` — `assertApiTokenPermission(context, action, contentTypeSlug)`: throws `GraphQLError` with `extensions.code: "UNAUTHENTICATED"` if `context.apiToken` is `null`; otherwise delegates the grant check to the shared `isDocumentActionGranted(context.apiToken.permissions, action, contentTypeSlug)` (`src/common/authorization/document-permission.util.ts`, also used by REST's `DocumentPermissionsGuard` — see `document.md`), throwing `"FORBIDDEN"` if neither the global `document:<action>` slug nor the scoped `document:<action>:<contentTypeSlug>` slug is present. **Signature changed from the original 2-arg `(context, slug)`** as part of a later cycle that let an API token scope a `document:*` grant to one content type instead of only "all content types" — every call site now passes the resolver's own `definition.slug` as `contentTypeSlug` (see [Resolvers](#resolvers) above). A token holding only the pre-existing global 2-segment slug (`document:read`) is unaffected — `isDocumentActionGranted` checks the global slug first, so old tokens keep working on every content type with zero behavior change.

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

Unit tests (Jest, `Test.createTestingModule` + `useValue` mocks or plain `new` construction, colocated `*.spec.ts`) — 11 spec files: `field-type-mapping.spec.ts`, `naming.spec.ts` (incl. the pluralization rule's irregular-suffix cases — `s`/`x`/`z`/`ch`/`sh`), `json-scalar.spec.ts`, `date-time-scalar.spec.ts` (domain, pure functions — serialize/parseValue/parseLiteral valid+invalid-Date/invalid-string paths); `schema-builder.service.spec.ts` (SDL generation per field type, both kinds, the pluralized list query name, the `<Type>List` envelope + `PaginationInput`/`PaginationMeta`/`ListMeta`, `IDFilter`/`TimeFilter`/system-field filters, `and`/`or`/`not` on `<Type>Filter`, `DateTime` scalar + system fields on `<Type>`, deterministic-ordering across repeated calls, shared types emitted exactly once), `resolver-factory.service.spec.ts` (resolver delegation with exact-args assertions for every query/mutation across both kinds incl. `documentId` naming, list-query envelope construction across all pagination modes incl. `limit: -1`, media-field resolution incl. dangling/null FK, permission-required/wrong-scope/missing-token branches per mutation — every `assertApiTokenPermission` call-site assertion now checks `action` **and** `contentTypeSlug` args, not just the slug — error-code mapping), `list-args.translator.spec.ts` (all 13 pagination-validation rules with exact error strings, `in`/`notIn` + system-field filter resolution, `and`/`or`/`not` tree resolution at multiple nesting depths, `createdAt DESC` default, every validation-rejection path), `authorize.util.spec.ts` (global-slug grant, content-type-scoped grant, scoped-for-wrong-content-type denial, `UNAUTHENTICATED` with no token, `FORBIDDEN` with an insufficient token), `graphql-context.factory.spec.ts`, `format-error.util.spec.ts`, `graphql.module.spec.ts`.

e2e (`test/graphql.e2e-spec.ts`, real Postgres, `bootTestApp` — same infra `content-engine.e2e-spec.ts` uses): single/list queries against real `cv-page` data (published/draft, with/without token) using the pluralized query name and `documentId` arg; the full `<Type>List` envelope shape; all 13 pagination-rule cases plus `limit: -1` (unlimited, `pageSize === total`); `in`/`notIn` and system-field (`documentId`/`createdAt`/...) filter cases; a `SPEC.md §3.5`-style `and`/`or`/`not` combinator query against real seeded rows; real `createdAt`/`updatedAt`/`publishedAt` timestamps resolving on single/list/mutation responses; 3-level nested component read with a `json`-typed array field; a throwaway media-bearing collection-type content type (file written to `content-types/` before boot) proving media FK resolution including the null-FK case; full collection-type CRUD+publish+unpublish lifecycle plus every mutation's permission-denied case; a throwaway single-type content type proving the full save→publish→unpublish lifecycle with no `documentId` anywhere; a real introspection query against the full generated schema.

**Content-type-scoped document permissions** (`describe("content-type-scoped document permissions")`): a real API access token created with `permissions: ["document:read:cv-page"]` succeeds querying `cvPage(documentId: ...)`, while the same token gets `FORBIDDEN` querying a different content type; a token holding only the pre-existing global `document:read` still succeeds on every content type (regression, proves zero behavior change for tokens that predate this feature). Both throwaway content types are torn down in `afterAll` via `syncService.sync(realDefs)` — the same code path the boot process itself uses. `document`'s own unit suite (`where-builder.spec.ts`'s `buildFilterTree` cases, `prisma-document.repository.spec.ts`'s `filterTree`/`limit: -1` branches) and REST's own e2e suites were re-run unaffected, confirming the additive-only boundary held.

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

`bun run build`, `bunx tsc --noEmit`, `bun run lint`, and `bun run test:cov` all pass (136 suites, 907 tests repo-wide, including every spec listed under [Tests](#tests) above). `bun run test:e2e` is green across all four e2e suites together (50 tests), including `graphql.e2e-spec.ts`'s 28 — full collection-type and single-type lifecycles, nested component + media resolution, permission-denied paths, and the introspection query — against a real reachable Postgres. A five-axis review ran over the complete feature diff (Phases 1–6) with both real findings fixed, confirmed by the same full check suite passing again afterward.

A follow-up cycle then closed the one remaining gap: published-data reads (`Query.<slug>`/`Query.<slug>List` without `status: "draft"`) required no token at all, unlike every draft read and mutation. `assertApiTokenPermission(context, "document:read")` is now hoisted above the `status` branch in both single-item query resolvers and added (net-new) to the list query resolver — every GraphQL read now requires `document:read`, with no published-data exception. REST's public endpoints are untouched.

**Content-type-scoped document permissions cycle:** `assertApiTokenPermission` gained its `contentTypeSlug` parameter (see [Auth](#auth) above), letting an API token's `permissions` scope a `document:*` grant to one content type instead of only "all content types" — the identical grant model REST's `DocumentPermissionsGuard` enforces (see `document.md`), sharing the same `isDocumentActionGranted` util so the two enforcement paths can never drift apart. `bun run build`, `bun run lint`, and `bun run test:cov` pass (141 suites, 1024 tests repo-wide); `bun run test:e2e` passes (4 suites, 72 tests), including the new "content-type-scoped document permissions" case in `graphql.e2e-spec.ts` and its REST counterpart in `content-engine.e2e-spec.ts` (see `document.md`'s Tests section). Existing global-slug tokens are unaffected — regression-tested on both surfaces.

A final, larger cycle — the **GraphQL Contract Parity Pass** (5 phases, 5 commits: naming+`documentId` → envelope+pagination+orderBy default → `DateTime`+system fields → operators+system-field filters → `and`/`or`/`not` combinators) — reconciled this module against a Go reference implementation; see [GraphQL Contract Parity Pass](#graphql-contract-parity-pass) at the top of this doc for the full list of contract changes, and [List envelope & pagination](#list-envelope--pagination) / [Filtering & sorting](#filtering--sorting) above for the details.

A five-axis review over the full pass's diff flagged two real gaps, both fixed:

1. **`resolvePagination` didn't reject a negative `limit`/`pageSize` other than the special-cased `-1`.** A value like `limit: -2` or `pageSize: -5` would sail through `Math.min(x, 100)` unchanged and reach `prisma-document.repository.ts` as a negative bind parameter, which Postgres rejects outright — surfacing as a raw, uncaught error instead of the clean `BAD_USER_INPUT` every other rule in the [pagination table](#list-envelope--pagination) provides. Fixed with explicit `pageSize < 0`/`limit < -1` checks (`"pageSize must not be negative"` / `"limit must not be negative (use -1 for unlimited)"`).
2. **No reserved-name guard for the camelCase system fields this pass introduced.** `schema-builder.service.ts` unconditionally bakes `documentId`/`createdAt`/`updatedAt`/`publishedAt` into every generated object type and those plus `and`/`or`/`not` into every `<Type>Filter`, but nothing stopped a content type from naming a real field `createdAt` (or `and`, etc.) — producing a duplicate SDL field name that Apollo's schema parser rejects, taking down the *entire* GraphQL module (every content type) at boot, not just the offending one. Fixed in `content-type`'s `schema-validator.ts`: `RESERVED_SYSTEM_FIELD_NAMES` now also rejects `documentId`, `createdAt`, `updatedAt`, `publishedAt`, `and`, `or`, `not` as content-type field names, so this fails safely and locally at content-type creation instead of at server boot (see `content-type.md`).

`bun run build`, `bun run lint`, `bun run test:cov` (137 suites / 976 tests repo-wide) and `bun run test:e2e` (4 suites / 61 tests, incl. `graphql.e2e-spec.ts`'s full pagination/filter/combinator matrix) were all re-verified green as the pass's final checkpoint, including both fixes above.
