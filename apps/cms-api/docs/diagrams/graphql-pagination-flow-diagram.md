# GraphQL — sort / filter / pagination flow

Scope: how a list query's `where`, `orderBy`, and `pagination` arguments are resolved
into a SQL-ready shape and how the response envelope is built. Read directly from
`src/modules/graphql/**` (`schema-builder.service.ts`, `list-args.translator.ts`,
`resolver-factory.service.ts`) — not inferred. Cross-referenced against
`docs/documents/graphql.md` for narrative context only.

## Diagram — resolving a list query's arguments

```mermaid
flowchart TD
    Q["list query: items(where, orderBy, pagination)"] --> Env["response envelope:\n{ items: [...], meta: { pagination: ListMeta } }"]

    Q --> Page["resolvePagination(pagination)"]
    Page --> PMode{"start/limit set\nAND page/pageSize set?"}
    PMode -- both set --> PErr["throws — offset and page modes\nare mutually exclusive"]
    PMode -- neither set --> PDef["defaults: start = 0, limit = 10"]
    PMode -- offset mode --> POff["start, limit as given"]
    PMode -- page mode --> PPage["derive start/limit from page, pageSize"]
    POff --> PLimit{"limit == -1?"}
    PPage --> PLimit
    PDef --> PLimit
    PLimit -- yes --> PUnlim["UNLIMITED: size = -1, unclamped"]
    PLimit -- "other negative" --> PNegErr["throws"]
    PLimit -- positive --> PClamp["clamp to MAX_LIMIT = 100"]
    PUnlim --> PMeta["buildPaginationMeta:\nsize -1 => page 1, pageSize = total"]
    PClamp --> PMeta2["buildPaginationMeta:\npage = floor(start/size) + 1, pageSize = size"]

    Q --> Filter["resolveFilterNode(where)"]
    Filter --> FSys["every Type Filter prepends system fields:\ndocumentId: IDFilter, createdAt/updatedAt/publishedAt: TimeFilter"]
    FSys --> FOps["IDFilter: eq/ne/in/notIn\nTimeFilter: eq/ne only\nenforced server-side by SYSTEM_FILTER_OPERATORS"]
    Filter --> FRecurse{"node key?"}
    FRecurse -- "and" --> FAnd["array of nested FilterNode, recurse"]
    FRecurse -- "or" --> FOr["array of nested FilterNode, recurse"]
    FRecurse -- "not" --> FNot["single nested FilterNode, recurse"]
    FRecurse -- "field leaf" --> FLeaf["resolveFieldLeaves,\naliased to snake_case columns,\ne.g. documentId to document_id"]
    FAnd --> FCombine["multiple non-null entries at a level\nimplicitly ANDed together"]
    FOr --> FCombine
    FNot --> FCombine
    FLeaf --> FCombine
    FCombine --> FEmpty{"no filter fields at all?"}
    FEmpty -- yes --> FUndef["resolves to undefined —\ndistinct from an explicit combinator"]
    FEmpty -- no --> FNode["resolved FilterNode passed to SQL layer"]

    Q --> Sort["resolveOrderBy(orderBy)"]
    Sort --> SCount{"how many non-null orderBy fields?"}
    SCount -- 0 --> SDef["default: created_at desc\nSYSTEM_ORDER_BY_ALIASES.createdAt, DEFAULT_SORT_DIR = desc"]
    SCount -- 1 --> SOne["use that field + direction"]
    SCount -- ">1" --> SErr["throws BAD_USER_INPUT —\nexactly one field supported in v1"]
    SOne --> SDir["SortDirection accepts ASC/DESC/asc/desc,\nnormalized to lowercase at the resolver map"]
```

## Notes

- `PaginationInput` fields (`start`, `limit`, `page`, `pageSize`) are all nullable in the
  SDL — the offset/page mode distinction is enforced entirely at resolution time, not by
  the schema.
- `limit: -1` is the documented "unlimited" sentinel; any other negative value is a hard
  error, not silently clamped.
- The empty-filter branch (`where` present but every field null) is deliberately distinct
  from `and: []` / `or: []` — it resolves to `undefined` rather than an empty combinator
  node.

Sources read: `src/modules/graphql/application/schema-builder.service.ts`,
`src/modules/graphql/application/list-args.translator.ts`,
`src/modules/graphql/application/resolver-factory.service.ts`.
