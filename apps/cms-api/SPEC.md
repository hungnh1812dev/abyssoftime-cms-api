# Spec — GraphQL Contract Parity Pass

Closes nine of the gaps identified when comparing `src/modules/graphql/**` against the ported-from-Go reference docs (`docs/golang/graphql.md`, `docs/golang/graphql-list-api-spec.md`, `docs/golang/guide.md`). Everything **not** listed below (auth model, locale, error-code format, media/component handling, `contains`-only-on-text) is explicitly out of scope and stays as-is — see `docs/documents/graphql.md` for why those were deliberate deviations, not gaps.

## 1. Objective

Bring the dynamic GraphQL schema's list/filter/sort/pagination/naming contract closer to the Go reference spec, without adopting the two structural changes that don't fit this repo (a `filters:` array arg, and Go's silent-orderBy-drop). No real consumer exists yet (`cms-admin` doesn't touch `/graphql`), so these are straight breaking renames/replacements, not additive aliases.

**In scope** (the 9 areas from the comparison):

| # | Area | Change |
|---|---|---|
| 1 | List query name | `<slug>List` → pluralized camelCase (`blogPosts`, not `blogPostList`) |
| 2 | Single-item arg name | `Id: ID!` → `documentId: ID!` (query + every mutation that takes one) |
| 3 | List response shape | bare `[Type!]!` → `<Type>List! { items, meta { pagination { page, pageSize, total } } }` |
| 4 | Pagination | flat `start`/`size` → `pagination: PaginationInput` (offset **or** page mode, `limit: -1` = unlimited, full Go validation/clamp rules, exact error strings) |
| 5 | Filter operators | union of current + Go: text/number gain `in`/`notIn`; new `IDFilter` (`eq,ne,in,notIn`) and `TimeFilter` (`eq,ne`) |
| 6 | Filter combinators | `<Type>Filter` gains `and`/`or`/`not` (self-referencing) — arg name stays `where`, **not** renamed to a `filters` array |
| 7 | System-field filters | `<Type>Filter` gains `documentId` (`IDFilter`), `createdAt`/`updatedAt`/`publishedAt` (`TimeFilter`) |
| 8 | OrderBy semantics | **unchanged** error-on-multi-field behavior kept (see Decision below); only the default sort column changes, `id DESC` → `createdAt DESC` |
| 9 | System fields on type | every generated `<Type>` gains `createdAt: DateTime!`, `updatedAt: DateTime!`, `publishedAt: DateTime` |

**Explicitly out of scope:** `locale` (repo-wide deviation, untouched), auth model (API-token scopes stay, no public reads added), `formatError`/error-code shape (keep `extensions.code`, don't switch to Go's message-only contract), media/component field handling (already at parity).

## 2. Decisions confirmed with the user (assumptions locked, not open questions)

1. **OrderBy:** keep the existing hardened behavior (throws `BAD_USER_INPUT` on more than one non-null field) — this reverses nothing from the last five-axis review. Only the *default* (`orderBy` omitted, or all-null) sort column changes to match Go: `createdAt DESC` instead of `id DESC`.
2. **Pagination:** full Go parity, including field *names* (`start`/`limit`/`page`/`pageSize` — not `start`/`size`) since the mandated error strings ("cannot mix offset (start/limit) and page (page/pageSize) modes", etc.) are only coherent if the field names match. Default `limit` when omitted: **10** (was `20` under the old `size` default) — this is a real, deliberate behavior change, not an oversight.
3. **Filter operators:** union, not strict Go parity — `contains` stays on `TextFilter` alongside the new `in`/`notIn`; `NumberFilter` keeps `gt/gte/lt/lte` alongside the new `in`/`notIn`.
4. **Breaking renames (1, 2, 3 above):** straight replacement. No dual/aliased schema, no deprecation period.
5. **New scalar required:** `createdAt`/`updatedAt`/`publishedAt` need a scalar the current schema doesn't have. Introducing `scalar DateTime` (ISO-8601 string, mirrors `domain/json-scalar.ts`'s pattern as `domain/date-time-scalar.ts`) — Go's docs call it `Time`, renamed to `DateTime` to avoid ambiguity with a plain string and match common GraphQL convention. **Flag if you'd rather keep the Go name `Time`.**
6. **Filter combinators reach into `document`'s SQL builder.** Today's filter engine (`list-args.translator.ts` → `FullListOptions.filters` → `where-builder.ts`) is a flat, implicitly-ANDed list. `and`/`or`/`not` requires a real tree structure (nested parenthesized SQL groups), which cannot be built inside the `graphql` module alone — `where-builder.ts` in `document/infrastructure/persistence/sql/` needs a new recursive builder. Per `workflow.md`'s module-independence rule, this will be **additive**: a new exported function alongside the existing flat one, with REST's own filter-query endpoints untouched (REST doesn't get `and`/`or`/`not` — not requested, no scope creep).

## 3. Contract details

### 3.1 Naming (`domain/naming.ts`)

Pluralization rule (must match exactly, no irregular plurals): append `es` if the camelCase name ends in `s`, `x`, `z`, `ch`, or `sh` (case-insensitive); otherwise append `s`. `listQueryName("blog-post")` → `"blogPosts"`; `listQueryName("en-it-vocab")` → `"enItVocabs"`.

### 3.2 Generated schema — collection-type (per content-type)

```graphql
scalar DateTime

input IDFilter    { eq: ID     ne: ID     in: [ID!]     notIn: [ID!] }
input TextFilter  { eq: String ne: String contains: String in: [String!] notIn: [String!] }
input NumberFilter{ eq: Float  ne: Float  gt: Float gte: Float lt: Float lte: Float in: [Float!] notIn: [Float!] }
input BooleanFilter { eq: Boolean }
input TimeFilter  { eq: DateTime ne: DateTime }

input PaginationInput { start: Int  limit: Int  page: Int  pageSize: Int }

type PaginationMeta { page: Int!  pageSize: Int!  total: Int! }
type ListMeta { pagination: PaginationMeta! }

type <Type> {
  documentId: ID!
  <...content fields...>
  createdAt: DateTime!
  updatedAt: DateTime!
  publishedAt: DateTime
}

input <Type>Filter {
  documentId: IDFilter
  createdAt: TimeFilter
  updatedAt: TimeFilter
  publishedAt: TimeFilter
  <...one entry per listable content field...>
  and: [<Type>Filter!]
  or: [<Type>Filter!]
  not: <Type>Filter
}

type <Type>List { items: [<Type>!]! meta: ListMeta! }

extend type Query {
  <slug>(documentId: ID!, status: String): <Type>
  <pluralSlug>(where: <Type>Filter, orderBy: <Type>OrderBy, pagination: PaginationInput): <Type>List!
}

extend type Mutation {
  create<Type>(data: <Type>Input!): <Type>!
  update<Type>(documentId: ID!, data: <Type>Input!): <Type>!
  delete<Type>(documentId: ID!): Boolean!
  publish<Type>(documentId: ID!): <Type>!
  unpublish<Type>(documentId: ID!): <Type>!
}
```

`IDFilter`/`TextFilter`/`NumberFilter`/`BooleanFilter`/`TimeFilter`/`PaginationInput`/`PaginationMeta`/`ListMeta` are shared, emitted once (same pattern as today's `TextFilter`/`NumberFilter`/`BooleanFilter`/`SortDirection`). `<Type>OrderBy` is unchanged in shape (still one `SortDirection` per listable field + system timestamps); only its resolved default changes (§3.4).

### 3.3 Pagination validation (`list-args.translator.ts`), in this exact order

| # | Condition | Result |
|---|---|---|
| 1 | `pagination` omitted | `start = 0, limit = 10` |
| 2 | both offset fields (`start`/`limit`) and page fields (`page`/`pageSize`) set | `BAD_USER_INPUT`: `"cannot mix offset (start/limit) and page (page/pageSize) modes"` |
| 3 | only one of `page`/`pageSize` set | `BAD_USER_INPUT`: `"page and pageSize must both be provided"` |
| 4 | `page < 1` | `BAD_USER_INPUT`: `"page must be >= 1"` |
| 5 | `pageSize == 0` | `BAD_USER_INPUT`: `"pageSize must not be 0"` |
| 6 | valid page mode | `pageSize = min(pageSize, 100)`; `start = (page-1)*pageSize`; `limit = pageSize` |
| 7 | offset mode, `start` omitted | `start = 0` |
| 8 | offset mode, `start < 0` | clamp to `0` (no error) |
| 9 | offset mode, `limit` omitted | `limit = 10` |
| 10 | offset mode, `limit == 0` | `BAD_USER_INPUT`: `"limit must not be 0"` |
| 11 | offset mode, `limit == -1` | unlimited — return every matching row |
| 12 | offset mode, `limit > 100` | clamp to `100` (no error) |
| 13 | offset mode, `0 < limit <= 100` | used as-is |

Response `meta.pagination`: `total` = count of all rows matching `where`, independent of pagination. `page`/`pageSize` computed post-resolution (`limit == -1` ⇒ `page: 1, pageSize: total`; else `page = floor(start/limit)+1, pageSize = limit`).

### 3.4 OrderBy (unchanged code path, new default)

Still: more than one non-null field on `orderBy` → `BAD_USER_INPUT` (existing hardening, kept as-is). Only change: when `orderBy` is omitted or every field is null, sort defaults to `createdAt DESC` (was `id DESC`).

### 3.5 Filter combinators (`where` stays the arg name)

```graphql
{
  blogPosts(
    where: { and: [{ documentId: { in: ["...", "..."] } }, { or: [{ featured: { eq: true } }, { title: { contains: "launch" } }] }] }
  ) { items { documentId title } meta { pagination { total } } }
}
```

Every non-null field on a `<Type>Filter` object (direct field conditions **and** `and`/`or`/`not`) is ANDed together at that level — same semantics as Go §5.3, just reached through `where` instead of a `filters` array.

## 4. Cross-module impact

| Module | Change | Type |
|---|---|---|
| `graphql` | naming, schema-builder, resolver-factory, list-args.translator rewrites; new `domain/date-time-scalar.ts` | Owning module, full rewrite of the touched files |
| `document` | `where-builder.ts` gains a new recursive/grouped SQL builder function (additive — existing flat builder untouched, still used by REST) | Additive only, per module-independence rule |
| `content-type` | none expected — `FieldDefinition`/`LISTABLE_FIELD_TYPES` already sufficient | None |

REST endpoints, REST's own filter-query syntax, and `cms-admin` are untouched by this pass.

## 5. Testing strategy

Same layers as the existing module (`docs/documents/graphql.md` §Tests): Jest unit specs colocated per file (`schema-builder.service.spec.ts`, `resolver-factory.service.spec.ts`, `list-args.translator.spec.ts`, `naming.spec.ts`, new `date-time-scalar.spec.ts`) plus `test/graphql.e2e-spec.ts` extended with: pluralized list query name, `documentId` arg naming end-to-end, the full pagination validation matrix (all 13 rules, exact error-string assertions), `and`/`or`/`not` combinator queries against real seeded rows, system-field filters (`documentId`, `createdAt` range), and the new `createdAt`/`updatedAt`/`publishedAt` fields resolving real timestamps. `where-builder.ts`'s new grouped-SQL path gets its own unit spec in `document` (nested AND/OR/NOT → correct parenthesization), run against real Postgres in the existing e2e infra. No new `coverageThreshold` entries needed beyond what already exists (no Prisma/controller files touched).

## 6. Boundaries

- **Always:** keep REST and `cms-admin` untouched; keep `where` as the filter arg name (not `filters`); keep the existing OrderBy multi-field error; verify via `bun run build`, `bun run lint`, `bun run test:cov`, `bun run test:e2e` before any commit.
- **Ask first:** any change to `where-builder.ts`'s existing flat builder (must stay additive-only, since REST depends on it); the `DateTime` vs `Time` scalar-name choice (see Decision 5); if a second `and`/`or`/`not` nesting depth limit is needed (not decided here).
- **Never:** touch auth/locale/error-format scope; add a `filters:` array arg; silently drop `orderBy` fields instead of erroring; add `coverageThreshold` entries for Prisma/controller files.

## 7. Success criteria

- [x] `<slug>List` renamed to pluralized `<pluralSlug>` for every collection content type, no old name left in the schema.
- [x] Every `Id` arg (query + 4 mutations) renamed to `documentId`.
- [x] Every list query returns `<Type>List! { items, meta: { pagination: { page, pageSize, total } } }`, never a bare array.
- [x] `pagination: PaginationInput` replaces `start`/`size`; all 13 validation rules pass with the exact Go error strings; `limit: -1` returns every row with `pageSize == total`.
- [x] `<Type>Filter` includes `documentId`/`createdAt`/`updatedAt`/`publishedAt` plus `and`/`or`/`not`, reachable only via `where`.
- [x] `TextFilter`/`NumberFilter` support `in`/`notIn` alongside existing operators; new `IDFilter`/`TimeFilter` exist with the documented operator sets.
- [x] Default sort (no `orderBy`, or all-null) is `createdAt DESC`; multi-field `orderBy` still throws `BAD_USER_INPUT` exactly as before.
- [x] Every generated `<Type>` exposes `createdAt`/`updatedAt`/`publishedAt` via the new `DateTime` scalar.
- [x] Full suite green: `bun run build`, `bun run lint`, `bun run test:cov`, `bun run test:e2e`.
