# Spec: Dynamic GraphQL API

Source design: `docs/graphql.md` (a Go/GORM-derived reference spec, `apps/api/graphql/dynamic/*.go`). This spec **ports the design**, not the file paths — the actual target is this repo's NestJS/Prisma/Postgres stack. Deviations from the source doc are called out inline, matching the pattern `content-type.md`/`document.md` already use for their own Go-derived source docs.

## Objective

Add a `POST /graphql` endpoint that exposes every synced content type (`cv-page`, `en-it-vocab`, and any future one) as GraphQL queries and mutations, generated dynamically from the same `content-types/*.json` schema-as-code definitions the REST API already uses — zero hand-written per-content-type resolver code. GraphQL becomes a second, parallel API surface over the exact same document/content-type engine; it must not fork any business logic away from the existing REST usecase layer.

**User:** external/build-time clients (e.g. a static-site generator, a headless frontend) that prefer a single GraphQL query over multiple REST round-trips, authenticating via a scoped API token rather than a logged-in admin session.

**Success looks like:** a client with a `document:read`-scoped API token can run `{ cvPageList(where: ..., orderBy: ..., start: 0, size: 10) { title coverImage { url } } }` and get real data shaped exactly like the REST list endpoint's projected rows, and a client with `document:create`/`document:publish` scopes can run the equivalent mutations — all without either module's existing REST controllers, services, or repositories changing behavior.

## Confirmed decisions (from this spec's clarification round)

| # | Decision | Chosen | Rationale |
|---|---|---|---|
| 1 | GraphQL runtime | `@nestjs/graphql` (schema-first) + `@nestjs/apollo` + `@apollo/server`, `GraphQLModule.forRootAsync` | User's explicit pick over a hand-rolled `graphql-http` mount — see `docs/documents/graphql-techstack.md` for the full comparison and the timing fix this requires (#4 below) |
| 2 | v1 scope | Full CRUD + publish/unpublish mutations, matching the source doc's full surface | User confirmed — not deferring mutations to a later cycle |
| 3 | Auth | `Authorization: Bearer <token>` via the existing, currently-unwired `ApiTokenGuard`/`ACCESS_TOKEN_REPOSITORY` (`access-tokens` module) | GraphQL becomes that guard's first real consumer — zero changes inside `access-tokens` itself, just `imports: [AccessTokenModule]`. Mutation/draft-read authorization checks `request.apiToken.permissions` (the token's own scoped slug list) against the same `document:*`/`content_type:*` permission slugs REST already seeds — no new permission slugs |
| 4 | Schema-build timing | Read `content-types/*.json` directly via `SchemaLoaderService` (additive export from `ContentTypeModule`), not `CONTENT_TYPE_REPOSITORY.findAll()` | `forRootAsync`'s typeDefs factory resolves during module init, **before** `ContentTypeSyncService`'s `OnApplicationBootstrap` DB sync runs — reading the DB here would race a fresh boot. Reading the same JSON files the sync engine itself reads sidesteps the ordering dependency entirely instead of duplicating the sync trigger |
| 5 | `locale` | Dropped entirely | Matches this repo's repo-wide, already-documented deviation (no `locale` column/param anywhere in `content-type`/`document`) |
| 6 | Introspection/Playground | Dev-only (`NODE_ENV !== "production"`) | A public schema dump reveals every content type's shape to unauthenticated probing |
| 7 | Filter operators | Ship v1 with REST's existing set only (`eq`/`ne`/`contains` text, `eq`/`ne`/`gt`/`gte`/`lt`/`lte` number, `eq` boolean) | `startsWith`/`endsWith`/`in` would require editing `document`'s tested `where-builder.ts`/`filter-query.parser.ts` internals — deferred to a follow-up cycle rather than done as a side effect of this feature |
| 8 | `search` on GraphQL lists | Omitted from v1 | Source doc's GraphQL list query has no `search` arg; can be added later as a new optional arg without a breaking change |

## Tech Stack

- Runtime deps to add: `@nestjs/graphql`, `@nestjs/apollo`, `@apollo/server`, `graphql` (none currently in `package.json`).
- No new database tables/columns — this feature reads/writes exclusively through existing `content-type` and `document` repositories and services.

## Project Structure

New, self-contained module — no other module's own files are edited beyond the additive `exports:` changes listed below.

```
src/modules/graphql/
  graphql.module.ts                          # GraphQLModule.forRootAsync wiring; imports ContentTypeModule, DocumentModule, MediaModule, AccessTokenModule
  graphql.module.spec.ts
  domain/
    field-type-mapping.ts                    # FieldType -> GraphQL scalar/type-name mapping (mirrors content-type's field-type-mapping.ts shape)
    field-type-mapping.spec.ts
    naming.ts                                # slug -> PascalCase/camelCase Type/Input/Filter/OrderBy/Query/Mutation name derivation
    naming.spec.ts
  application/
    schema-builder.service.ts                # SDL string generator, reads ContentTypeDefinition[] via SchemaLoaderService
    schema-builder.service.spec.ts
    resolver-factory.service.ts              # per-content-type resolver map; delegates to document/single-type services + MediaAssetRepository — no business logic
    resolver-factory.service.spec.ts
    list-args.translator.ts                  # GraphQL where/orderBy/start/size args -> the same ListOptions/ParsedFilter shape document's list-query.parser.ts already produces
    list-args.translator.spec.ts
    graphql-context.factory.ts               # per-request context: verifies Authorization: Bearer via ApiTokenGuard's own verification path, attaches { apiToken } (or none)
    graphql-context.factory.spec.ts
    authorize.util.ts                        # assertApiTokenPermission(context, slug) -> GraphQLError (UNAUTHENTICATED / FORBIDDEN), checked against existing document:*/content_type:* slugs
    authorize.util.spec.ts
```

**Additive-only changes to existing modules** (no internal logic touched, exports arrays only):
- `ContentTypeModule` — export `SchemaLoaderService` (currently module-private).
- `DocumentModule` — add an `exports:` array (currently has none) for the collection- and single-type services GraphQL resolvers delegate to (save/publish/unpublish/delete/get-for-edit/get-public/list, single-type equivalents).
- `MediaModule` — add an `exports:` array (currently has none) for `MEDIA_ASSET_REPOSITORY`.
- `src/app.module.ts` — add `GraphqlModule` to `imports`, after `DocumentModule`.

## Field Type Mapping

| Content-Type `type` | GraphQL type |
|---|---|
| `text` | `String` |
| `richtext` | `String` |
| `number` | `Float` |
| `boolean` | `Boolean` |
| `media` | `MediaAsset` object (`{ documentId, url, thumbnailUrl, fileName, width, height }` — matches `MediaAssetEntity`'s real fields) |
| `json` | `JSON` scalar |
| `component` | Nested object type, `<ContentType><ComponentName>` PascalCase, media/component sub-fields resolved recursively |

## Generated Schema Per Content-Type

**Collection-type** (e.g. `cv-page`, `en-it-vocab` — both real seeds are `collection`-kind):
- `Query.<slug>(Id: ID!, status: String): <Type>` — nullable; defaults to published, `status: "draft"` requires a token scoped `document:read` (draft is not a public concept)
- `Query.<slug>List(where: <Type>Filter, orderBy: <Type>OrderBy, start: Int, size: Int): [<Type>!]!`
- `Mutation.create<Type>(data: <Type>Input!): <Type>!` — requires `document:create`
- `Mutation.update<Type>(Id: ID!, data: <Type>Input!): <Type>!` — requires `document:update`
- `Mutation.delete<Type>(Id: ID!): Boolean!` — requires `document:delete`
- `Mutation.publish<Type>(Id: ID!): <Type>!` — requires `document:publish`, 400-equivalent in Mode B (matches `assertDraftPublishEnabled`)
- `Mutation.unpublish<Type>(Id: ID!): <Type>!` — requires `document:unpublish`

**Single-type** (no real seed today, but the schema builder must handle it — same as REST):
- `Query.<slug>(status: String): <Type>` — nullable
- `Mutation.save<Type>(data: <Type>Input!): <Type>!` — requires `document:update`
- `Mutation.publish<Type>(): <Type>!` / `Mutation.unpublish<Type>(): <Type>!`

**Response shape:** nullable object for single queries, `[Type!]!` for list queries — **no `data` wrapper** (the source doc's own v1.13/v1.14 changelog entries supersede its earlier §3 examples/§5 boundary table, which still show a stale wrapped shape).

## Naming Conventions

Unchanged from the source doc: Type = PascalCase(slug), Input = `<Type>Input`, Filter = `<Type>Filter`, OrderBy = `<Type>OrderBy`, query single = camelCase(slug), query list = camelCase(slug) + `List`, component types = PascalCase(`<ContentType><ComponentName>`).

## Filtering & Sorting

| Field type | v1 GraphQL operators (= REST's existing `where-builder.ts` set) | Source doc's fuller set (deferred, decision #7) |
|---|---|---|
| `text` | `eq`, `ne`, `contains` | + `startsWith`, `endsWith`, `in` |
| `number` | `eq`, `ne`, `gt`, `gte`, `lt`, `lte` | + `in` |
| `boolean` | `eq` | `eq` |
| `component` | nested filter on sub-fields | — |

`AND`/`OR`/`NOT` top-level logical operators. `OrderBy` on scalar fields + `createdAt`/`updatedAt`/`publishedAt`.

**v1 operator set is REST's existing one** (`eq`/`ne`/`contains`/`gt`/`gte`/`lt`/`lte`/boolean `eq`) — no `document` module internals touched. `startsWith`/`endsWith`/`in` are an explicit follow-up, not in scope (decision #7 above).

**No `search` arg on GraphQL list queries in v1** (decision #8 above) — matches the source doc as written.

## Code Style

Match existing module conventions exactly — one real example (`content-type`'s `GetContentTypeService`):

```ts
import { ContentTypeEntity } from "../../domain/entities/content-type.entity";
import { CONTENT_TYPE_REPOSITORY, ContentTypeNotFoundError, type IContentTypeRepository } from "../../domain/repositories/content-type.repository";

import { Inject, Injectable, NotFoundException } from "@nestjs/common";

@Injectable()
export class GetContentTypeService {
  constructor(@Inject(CONTENT_TYPE_REPOSITORY) private readonly contentTypes: IContentTypeRepository) {}

  async execute(slug: string): Promise<ContentTypeEntity> {
    const contentType = await this.contentTypes.findBySlug(slug);
    if (!contentType) {
      throw new NotFoundException(new ContentTypeNotFoundError(slug).message);
    }
    return contentType;
  }
}
```

Class-based DI services, `@Inject(TOKEN)` for interface ports, sorted imports (`@trivago/prettier-plugin-sort-imports`, already configured), `@/` path alias, no `data` wrapper on GraphQL responses (see above).

## Testing Strategy

- **Unit** (Jest, colocated `*.spec.ts`, `Test.createTestingModule` + `useValue` mocks or plain `new` construction — same as every existing module): SDL generation per field type / both kinds, naming derivation, resolver delegation (assert it calls the injected service with the right args and does nothing else), `list-args.translator` (GraphQL args -> `ListOptions`/`ParsedFilter[]` parity with REST's own parser), `authorize.util` (scoped-token pass/fail per required slug), `graphql-context.factory` (missing/invalid/valid/expired token branches, mirroring `api-token.guard.spec.ts`'s existing branch coverage).
- **e2e** (`test/graphql.e2e-spec.ts`, real Postgres, `bootTestApp` — same infra `content-engine.e2e-spec.ts` already uses): boot exposes `cvPageList`/`enItVocabList` etc.; a `document:read`-scoped token can query published data, cannot see draft without `status: "draft"` **and** the right scope; each mutation type end-to-end including a component/media nested round-trip; permission-denied paths (missing token, wrong scope) return a GraphQL error, not a crash; introspection query fails when `NODE_ENV=production`.
- Per project rule: no `coverageThreshold` entries for any Prisma/controller-equivalent file this feature touches (there are none of that shape here — this module is pure application logic, so normal per-file thresholds apply, matching `content-type`'s `application/` layer precedent).

## Boundaries

| Rule | Detail |
|---|---|
| **Always** | Every resolver delegates to an existing `document`/`content-type` usecase service — zero business logic (validation, draft/publish branching, component I/O) duplicated in the `graphql` module |
| **Always** | Reuse the existing `document:*`/`content_type:*` permission slugs for authorization — never invent new ones |
| **Always** | List queries support `where`, `orderBy`, `start`, `size` |
| **Always** | Additive-only touches to `content-type`/`document`/`media` (new `exports:` entries only, per the Project Structure section) |
| **Always** | Introspection/Playground gated to non-production |
| **Never** | A `data`-wrapper response shape (superseded by the source doc's own v1.13/v1.14 changelog) |
| **Never** | A `locale` param anywhere |
| **Never** | Raw Prisma/SQL access from inside the `graphql` module — all reads/writes go through injected `document`/`content-type` services |
| **Never** | Edit `document`'s `where-builder.ts`/`filter-query.parser.ts` operator set in this cycle (decision #7) — v1 ships REST's existing operators only |

## Success Criteria

1. `bun run build`, `bunx tsc --noEmit`, `bun run lint`, `bun run test:cov` all green.
2. Fresh `bun run start:dev` boot exposes `POST /graphql` serving `cvPage`/`cvPageList`/`enItVocab`/`enItVocabList` queries and their full CRUD + publish/unpublish mutations, matching the field-type-mapping table.
3. A `document:read`-scoped API token can list/query published documents; cannot see drafts without both `status: "draft"` and the read scope.
4. A token scoped with the relevant `document:*` permission can run the matching mutation; an unscoped/absent/invalid token gets a GraphQL error, never a 500.
5. Introspection/Playground reachable only when `NODE_ENV !== "production"`.
6. `test/graphql.e2e-spec.ts` green against real Postgres, covering the full list above.
7. `docs/documents/graphql.md` and `docs/documents/graphql-techstack.md` reflect final shipped state (per `docs/rules/workflow.md`'s "Update docs" step); `SPEC.md` trimmed back to a one-line pointer once Review completes.
