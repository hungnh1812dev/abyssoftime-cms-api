# GraphQL List API — Contract Spec

## 0. Purpose & scope

This document specifies the **pagination, filtering, ordering, and list-response contract** currently implemented by this project's GraphQL API (`apps/api/graphql/`), in enough detail to reimplement equivalent behavior on a different stack (e.g. a Next.js GraphQL server) without reading the Go source.

It is **framework-agnostic on purpose** — it does not prescribe a GraphQL server library, ORM, or database. It specifies:

- exact input/output type shapes
- exact validation rules and error conditions
- exact semantics for ambiguous cases (e.g. what happens when two pagination modes are both supplied, what happens when `orderBy` has multiple fields set)

If you are porting this feature, treat every rule below as a requirement, not a suggestion — the goal is behavioral parity, not just shape parity. Where the source project's naming derives from a `slug` (`content-types/*.json`), an equivalent "resource name" concept in your own system can substitute directly.

Source of truth this spec was extracted from: `apps/api/cmd/gqlcodegen/main.go` (schema generation), `apps/api/graphql/resolver/document_helpers.go` (pagination/response logic), `apps/api/graphql/resolver/filter.go` (filter/orderBy conversion), `apps/api/graphql/schema/base.graphql` (shared types). See also [guide.md § GraphQL API](guide.md#graphql-api) for a narrative walkthrough of this same project's live implementation.

---

## 1. Naming conventions

Every resource (in the source project: a "content type", identified by a `slug` like `cv-page`) generates a family of typed GraphQL identifiers. Given `slug = "cv-page"`:

| Identifier | Derivation | Example |
|---|---|---|
| Type name | PascalCase(slug) | `CvPage` |
| Single-item query field | camelCase(slug) | `cvPage` |
| List query field | pluralize(camelCase(slug)) | `cvPages` |
| Input type | `<Type>Input` | `CvPageInput` |
| Filter type | `<Type>Filter` | `CvPageFilter` |
| OrderBy type | `<Type>OrderBy` | `CvPageOrderBy` |
| List wrapper type | `<Type>List` | `CvPageList` |

**Pluralization rule** (must match exactly if you want the same field names): append `es` if the camelCase name ends in `s`, `x`, `z`, `ch`, or `sh` (case-insensitive check, suffix preserved); otherwise append `s`. No irregular plurals (e.g. `person` → `persons`, not `people`).

Do **not** derive the list query field as `<slug>List` — despite that pattern appearing in this project's own module rules doc, the actual generator pluralizes instead (`cvPages`, not `cvPageList`). `<Type>List` is reserved for the wrapper *type* name only.

A resource is either a **collection** (has many entries, supports list queries) or a **single type** (exactly one entry, no list query, no `documentId`/id argument). This distinction changes which query/mutation fields are generated — see §3.

---

## 2. Shared base types

These are declared once and reused by every generated resource:

```graphql
enum SortOrder {
  ASC
  DESC
}

input IDFilter {
  eq: ID
  ne: ID
  in: [ID!]
  notIn: [ID!]
}

input StringFilter {
  eq: String
  ne: String
  in: [String!]
  notIn: [String!]
}

input NumberFilter {
  eq: Float
  ne: Float
  in: [Float!]
  notIn: [Float!]
}

input BooleanFilter {
  eq: Boolean
  ne: Boolean
}

input TimeFilter {
  eq: Time
  ne: Time
}

input PaginationInput {
  start: Int
  limit: Int
  page: Int
  pageSize: Int
}

type PaginationMeta {
  page: Int!
  pageSize: Int!
  total: Int!
}

type ListMeta {
  pagination: PaginationMeta!
}
```

Note the asymmetry: `BooleanFilter` and `TimeFilter` support only `eq`/`ne` (no `in`/`notIn`) — this is intentional, not an oversight. Keep it if parity matters; it exists because "is this boolean one of these N values" and "is this timestamp one of these N values" are not meaningful query shapes in practice.

---

## 3. Per-resource generated schema

### 3.1 Collection resource

```graphql
type <Type> {
  documentId: ID!
  <...content fields...>
  locale: String!
  createdAt: Time!
  updatedAt: Time!
  publishedAt: Time
}

input <Type>Input {
  <...content fields, writable subset only...>
}

input <Type>Filter {
  documentId: IDFilter
  createdAt: TimeFilter
  updatedAt: TimeFilter
  publishedAt: TimeFilter
  <...one entry per filterable content field, see §5.1 for type mapping and exclusions...>
  and: [<Type>Filter!]
  or: [<Type>Filter!]
  not: <Type>Filter
}

input <Type>OrderBy {
  id: SortOrder
  <...one entry per orderable content field, in schema declaration order...>
  createdAt: SortOrder
  updatedAt: SortOrder
  publishedAt: SortOrder
}

type <Type>List {
  items: [<Type>!]!
  meta: ListMeta!
}

extend type Query {
  <slug>(documentId: ID!, locale: String, status: String): <Type>
  <slugs>(pagination: PaginationInput, filters: [<Type>Filter!], orderBy: <Type>OrderBy, locale: String, status: String): <Type>List!
}

extend type Mutation {
  create<Type>(data: <Type>Input!): <Type>! @auth
  update<Type>(documentId: ID!, data: <Type>Input!): <Type>! @auth
  delete<Type>(documentId: ID!): Boolean! @auth
  publish<Type>(documentId: ID!, locale: String): <Type>! @auth
  unpublish<Type>(documentId: ID!, locale: String): <Type>! @auth
}
```

### 3.2 Single-type resource

No `documentId`/id argument anywhere, no list query, no `<Type>Filter`/`<Type>OrderBy`/`<Type>List`:

```graphql
extend type Query {
  <slug>(locale: String, status: String): <Type>
}

extend type Mutation {
  save<Type>(data: <Type>Input!, locale: String): <Type>! @auth
  publish<Type>(locale: String): <Type>! @auth
  unpublish<Type>(locale: String): <Type>! @auth
}
```

Pagination/filtering/ordering (§4–§6) do not apply to single types — skip them entirely when porting a single-type resource.

---

## 4. Pagination contract

### 4.1 Input shape

```graphql
input PaginationInput {
  start: Int      # offset mode
  limit: Int      # offset mode
  page: Int       # page mode, 1-indexed
  pageSize: Int   # page mode
}
```

Two mutually exclusive modes share one input type. Mode is detected by **presence**, not by a separate discriminator field:

```
hasOffset := start != null || limit != null
hasPage   := page  != null || pageSize != null
```

### 4.2 Validation rules — implement exactly, in this order

| # | Condition | Result |
|---|---|---|
| 1 | `pagination` argument omitted entirely | `start = 0, limit = 10` (offset mode defaults) |
| 2 | `hasOffset && hasPage` (fields from both modes set) | **Error**: `"cannot mix offset (start/limit) and page (page/pageSize) modes"` |
| 3 | `hasPage`, but only one of `page`/`pageSize` set | **Error**: `"page and pageSize must both be provided"` |
| 4 | `hasPage`, `page < 1` | **Error**: `"page must be >= 1"` |
| 5 | `hasPage`, `pageSize == 0` | **Error**: `"pageSize must not be 0"` |
| 6 | `hasPage`, valid | `pageSize = min(pageSize, 100)`; `start = (page - 1) * pageSize`; `limit = pageSize` |
| 7 | `hasOffset`, `start` omitted | `start = 0` |
| 8 | `hasOffset`, `start < 0` | Silently clamped to `0` (not an error) |
| 9 | `hasOffset`, `limit` omitted | `limit = 10` |
| 10 | `hasOffset`, `limit == 0` | **Error**: `"limit must not be 0"` |
| 11 | `hasOffset`, `limit == -1` | Special value: **no limit**, return every matching row |
| 12 | `hasOffset`, `limit > 100` | Silently clamped to `100` (not an error) |
| 13 | `hasOffset`, `0 < limit <= 100` | Used as-is |

Errors surface as GraphQL top-level `errors[].message` (see §8) with `data` for that field set to `null` — they are not domain/validation errors returned inside the payload.

### 4.3 Response metadata computation

After resolving `start`/`limit` per §4.2 and running the query (`total` = count of all matching rows before pagination is applied, i.e. filtered but not paginated):

```
if limit == -1:
    page = 1
    pageSize = total
elif limit > 0:
    page = floor(start / limit) + 1
    pageSize = limit
```

`pageSize` in the response reflects the **effective** page size (post-clamp, or `total` for the unlimited case) — never echo the raw client-supplied value if it was clamped.

`total` is always the full count of rows matching the current `filters`, independent of `start`/`limit`/`page`/`pageSize`.

---

## 5. Filtering contract

### 5.1 Filter type generation per field

For every content field on a resource, generate one `<Type>Filter` entry, using this type mapping:

| Content field type | Filter type |
|---|---|
| text / string | `StringFilter` |
| richtext | `StringFilter` |
| number | `NumberFilter` |
| boolean | `BooleanFilter` |
| date/time | `TimeFilter` |
| id / documentId | `IDFilter` |

**Excluded from filtering entirely** (no filter field generated, regardless of nesting):
- `component` fields (both repeatable and non-repeatable)
- `media` fields
- `json` fields

This is a hard rule, not a current limitation to relax casually — filtering into JSON blobs or repeatable component sub-fields requires query-shape decisions (path syntax, array semantics) that are explicitly out of scope for this contract.

System fields always included: `documentId` (`IDFilter`), `createdAt`, `updatedAt`, `publishedAt` (`TimeFilter` each).

### 5.2 Operators

| Filter type | Supported operators |
|---|---|
| `IDFilter` | `eq`, `ne`, `in`, `notIn` |
| `StringFilter` | `eq`, `ne`, `in`, `notIn` |
| `NumberFilter` | `eq`, `ne`, `in`, `notIn` |
| `BooleanFilter` | `eq`, `ne` |
| `TimeFilter` | `eq`, `ne` |

`in`/`notIn` take a list; `eq`/`ne` take a scalar. Within one field's filter object (e.g. `{ company: { eq: "Acme", ... } }`), if multiple operators are set simultaneously, **all are applied** (implicitly ANDed) — this is a natural consequence of independently converting each non-null operator field to its own filter condition; there is no explicit precedence rule to apply beyond "every non-null operator on every non-null field becomes one condition, and conditions AND together" unless combined via `or`/`not` (§5.3).

### 5.3 Combinators

```graphql
input <Type>Filter {
  <field>: <FieldFilter>   # zero or more
  and: [<Type>Filter!]
  or: [<Type>Filter!]
  not: <Type>Filter
}
```

- `and: [...]` — every child filter must match (logical AND across the array).
- `or: [...]` — at least one child filter must match (logical OR across the array).
- `not: <Type>Filter` — negates a single nested filter (not an array).
- A `<Type>Filter` object can combine direct field conditions **and** `and`/`or`/`not` in the same object — all present conditions (field-level and combinator-level) are ANDed together at that level.

### 5.4 Top-level array semantics

The `filters` **query argument** is itself an array: `filters: [<Type>Filter!]`. Multiple entries in this top-level array are implicitly **ANDed** — equivalent to wrapping them in one `and: [...]`. This is a separate AND from the `and` field inside a single `<Type>Filter` object; both exist and both mean "AND", by design, for ergonomics (so callers don't need to write `and: [...]` for the common case of several independent top-level conditions).

Example — both forms below are equivalent:

```graphql
# form A — top-level array (implicit AND)
cvPages(filters: [{ company: { eq: "Acme" } }, { isMain: { eq: true } }])

# form B — explicit and
cvPages(filters: [{ and: [{ company: { eq: "Acme" } }, { isMain: { eq: true } }] }])
```

---

## 6. Ordering contract

### 6.1 Input shape

```graphql
input <Type>OrderBy {
  id: SortOrder
  <field1>: SortOrder
  <field2>: SortOrder
  ...
  createdAt: SortOrder
  updatedAt: SortOrder
  publishedAt: SortOrder
}
```

One optional `SortOrder` (`ASC`/`DESC`) per field, generated in the same order the fields appear in the resource's schema/type definition (content fields first, in declared order, then `createdAt`, `updatedAt`, `publishedAt`).

### 6.2 Resolution rule — single-key sort only

`orderBy` is **not** a multi-key sort. At resolve time, scan the fields **in schema declaration order** and use the **first field found with a non-null value**; every subsequent non-null field is ignored, even if set.

```
for field in schema_declaration_order(OrderByType):
    if orderBy[field] is not null:
        return (field, orderBy[field])
return default   # see 6.3
```

This means `orderBy: { isMain: DESC, company: ASC }` sorts by `isMain` only — `company` is silently ignored because `isMain` appears earlier in declaration order. If you need parity, do not "improve" this into a multi-key sort; document the single-key limitation to your own API's consumers instead, or make the change deliberately (and update this spec) rather than by accident.

### 6.3 Default

If `orderBy` is omitted, or every field on it is null: sort by `createdAt DESC`.

---

## 7. Response envelope

Every list query returns a non-null wrapper — never a bare array, and metadata is never optional:

```graphql
type <Type>List {
  items: [<Type>!]!
  meta: ListMeta!
}

type ListMeta {
  pagination: PaginationMeta!
}

type PaginationMeta {
  page: Int!
  pageSize: Int!
  total: Int!
}
```

Nullability contract:
- `items` is never null; an empty result set is `items: []`, not `items: null`.
- Each item in `items` is never null (`[<Type>!]!` — no null items in the array).
- `meta` and `meta.pagination` are never null — always present, even for an empty result set (with `total: 0`).

---

## 8. Query semantics: visibility, locale, auth

- Every list and single-item query accepts `locale: String` (unset = the resource's default/unlocalized data — implementation-specific, not part of this pagination/filter/order contract) and `status: String`.
- Default (no `status`, or any value other than exactly `"draft"`): returns **published** data only.
- `status: "draft"`: returns draft data, but **only if the request is authenticated** (a resolved user identity on the request context). If `status: "draft"` is passed on an unauthenticated request, it is **silently ignored** and published data is returned instead — this is not an error and does not leak draft existence/absence to anonymous callers.
- List mutations (`create`/`update`/`delete`/`publish`/`unpublish`) always require auth, independent of `status`.

### 8.1 Single-item query on a collection

`<slug>(documentId: ID!, locale: String, status: String): <Type>` — returns `null` (not an error) if no document matches `documentId`/`locale`/visibility. `documentId` is required; there is no filter/pagination on this field.

---

## 9. Error handling

- Validation errors (§4.2 pagination rules) surface as standard GraphQL top-level errors: `{ "data": { "<field>": null }, "errors": [{ "message": "<exact string from §4.2>", "path": ["<field>"] }] }`. No custom error codes/extensions are layered on top — the message text **is** the contract; match it verbatim if consumers may pattern-match on it.
- "Not found" for a single-item query is **not** an error — it is `data: { "<slug>": null }` with no `errors` entry.
- Filter/orderBy field-name mismatches (a filter or orderBy field that doesn't exist on the type) are caught by the GraphQL type system itself at parse/validation time (unknown input field), before resolver code ever runs — no additional application-level validation is needed for this case as long as your schema is strictly typed per-resource (§3), not a loosely-typed generic `JSON` filter blob.

---

## 10. Worked examples

### 10.1 Offset-mode pagination, default sort

```graphql
{
  cvPages(pagination: { start: 0, limit: 5 }) {
    items { documentId position company }
    meta { pagination { page pageSize total } }
  }
}
```

```json
{
  "data": {
    "cvPages": {
      "items": [ /* up to 5 items, newest createdAt first */ ],
      "meta": { "pagination": { "page": 1, "pageSize": 5, "total": 23 } }
    }
  }
}
```

### 10.2 Page-mode pagination, page 3

```graphql
{ cvPages(pagination: { page: 3, pageSize: 5 }) { meta { pagination { page pageSize total } } } }
```

`start = (3 - 1) * 5 = 10`, `limit = 5`. Response: `{ "page": 3, "pageSize": 5, "total": 23 }`.

### 10.3 Unlimited fetch

```graphql
{ cvPages(pagination: { limit: -1 }) { items { documentId } meta { pagination { page pageSize total } } } }
```

Returns all 23 rows; `meta.pagination = { "page": 1, "pageSize": 23, "total": 23 }`.

### 10.4 Mixing modes — error

```graphql
{ cvPages(pagination: { start: 0, page: 1 }) { items { documentId } } }
```

```json
{
  "data": { "cvPages": null },
  "errors": [{ "message": "cannot mix offset (start/limit) and page (page/pageSize) modes", "path": ["cvPages"] }]
}
```

### 10.5 Combined filter + orderBy

```graphql
{
  cvPages(
    filters: [{ company: { eq: "Acme" } }, { or: [{ position: { in: ["Backend Engineer", "Tech Lead"] } }] }]
    orderBy: { createdAt: DESC }
    pagination: { page: 1, pageSize: 10 }
  ) {
    items { documentId position company }
    meta { pagination { page pageSize total } }
  }
}
```

Semantics: `company == "Acme"` AND (`position IN ["Backend Engineer", "Tech Lead"]`), sorted by `createdAt` descending, first page of 10.

### 10.6 orderBy with multiple fields set (only the first applies)

```graphql
{ cvPages(orderBy: { isMain: DESC, company: ASC }) { items { documentId } } }
```

Sorts by `isMain DESC` only — `company: ASC` is ignored (see §6.2). If a consumer needs `company` as a tiebreaker, this contract cannot express it; that is a known limitation, not a bug to route around silently.

---

## 11. Porting checklist

Use this as an acceptance checklist when the new (e.g. Next.js) implementation is done. Each item should be independently testable:

- [ ] List query field name is the pluralized camelCase resource name (§1), not `<name>List`.
- [ ] `PaginationInput` accepts both offset (`start`/`limit`) and page (`page`/`pageSize`) modes on the same input type.
- [ ] All 13 validation/default rules in §4.2 are implemented, including the exact error message strings.
- [ ] `limit: -1` returns all rows and reports `pageSize == total` in the response.
- [ ] `pageSize`/`limit` silently clamp at 100 (no error) — confirm this doesn't also clamp `page`'s resulting `start` incorrectly.
- [ ] `<Type>Filter` excludes component, media, and json fields (§5.1).
- [ ] `BooleanFilter`/`TimeFilter` expose only `eq`/`ne` (no `in`/`notIn`) — the other three filter types expose all four operators.
- [ ] Top-level `filters: [...]` array is ANDed (§5.4), independent of the `and`/`or`/`not` fields inside each filter object.
- [ ] `orderBy` uses first-non-null-field-wins semantics in schema declaration order (§6.2), not multi-key sort.
- [ ] Default sort (no `orderBy`, or all fields null) is `createdAt DESC`.
- [ ] List responses always wrap in `{ items, meta: { pagination: { page, pageSize, total } } }` — never a bare array, never null `items`/`meta`.
- [ ] `total` reflects the filtered-but-unpaginated count.
- [ ] `status: "draft"` is honored only for authenticated requests; unauthenticated requests silently fall back to published data (no error, no leak).
- [ ] Single-item queries return `null` (not a GraphQL error) when not found.
