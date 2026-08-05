# Document flow — sort / filter / pagination (REST)

Scope: the collection-list REST endpoint's query-parameter parsing for pagination,
sort, search, and filters. Read directly from `src/modules/document/**` (`list-query.dto.ts`,
`list-query.parser.ts`, `filter-query.parser.ts`, `where-builder.ts`) — not inferred.
Cross-referenced against `docs/cms-admin-integration.md` for narrative context only, not
as the source of truth. See `graphql-pagination-flow-diagram.md` for the equivalent
GraphQL mechanism, which is a fully separate implementation.

## Diagram — parsing `GET /documents/collection-type/:slug`

```mermaid
flowchart TD
    Req["GET documents/collection-type/:slug?start=&size=&orderBy=&sortDir=&search=&filters[field][$op]=value"] --> SlugCheck["validateSlugParam: assertSafeSlug"]
    SlugCheck -->|"unsafe slug"| SlugErr["400, before the service even runs"]
    SlugCheck --> Parse["ListDocumentsService.execute -> parseListQuery"]

    Parse --> Start["start: default 0,\nmust be a non-negative integer"]
    Start -->|"invalid"| Err1["400"]

    Parse --> Size["size: default 20, max 100"]
    Size -->|"invalid or over max"| Err2["400"]

    Parse --> Sort["orderBy: default 'id'"]
    Sort --> SortCheck["validated against sortableColumnsFor(contentType.fields):\nsystem columns id/document_id/created_at/updated_at/published_at\nplus any text/number/boolean content field"]
    SortCheck -->|"unknown column"| Err3["400"]

    Parse --> Dir["sortDir: default 'desc',\nonly 'asc' or 'desc' accepted"]
    Dir -->|"other value"| Err4["400"]

    Parse --> Search["search: case-insensitive substring"]
    Search --> SearchFields["searchableFieldsFor:\nOR'd across text/richtext-typed listFields only\nSEARCHABLE_FIELD_TYPES = text, richtext"]

    Parse --> Filters["filters[field][$op]=value,\nbracket notation via parseFilters"]
    Filters --> QsNote["requires Express 'extended' query parser\nto build the nested object at all —\nset globally in configure-app.ts"]
    Filters --> OpCheck{"field's value class"}
    OpCheck -- text --> OpText["$eq $ne $contains"]
    OpCheck -- "number / timestamp system column" --> OpNum["$eq $ne $gt $gte $lt $lte"]
    OpCheck -- "boolean / id / document_id" --> OpBool["$eq $ne only —\nid/document_id explicitly excluded\nfrom range ops even though numeric/string"]
    Filters --> BoolLit["boolean values must be literal\nstring 'true' or 'false'"]
    Filters --> FieldCheck["every field name re-checked against\nthe same sortableColumnsFor allowlist orderBy uses"]

    Filters -->|"unknown field, unknown $op,\n>1 operator per field,\noperator illegal for the field's class,\nor non-string filter value"| Err5["400 at parse time —\nnothing silently dropped"]

    Start --> Combine["all checks pass"]
    Size --> Combine
    SortCheck --> Combine
    Dir --> Combine
    SearchFields --> Combine
    FieldCheck --> Combine
    BoolLit --> Combine

    Combine --> Combinator["filters AND search AND together;\nfiltered fields AND across each other —\nno OR-across-fields"]
    Combinator --> Sql["infrastructure/persistence/sql/where-builder.ts:\nsortableColumnsFor, buildOrderByClause, buildFilterWhere"]
    Sql --> Redundant["both orderBy and filter field-name allowlists\nare re-validated a SECOND time here,\nindependently of the parser layer —\ndeliberate defense-in-depth,\nnot shared logic, so a parser bug\ncan't silently widen what SQL trusts"]
    Redundant --> Query["paginated, sorted, filtered SQL query executes"]
```

## Notes

- Every validation failure (`start`, `size`, `orderBy`, `sortDir`, or any filter clause)
  throws `400 BadRequestException` at parse time, before any repository call — there is no
  silent fallback to defaults on bad input for filters, only for genuinely omitted params.
- The double-validation (parser layer, then `where-builder.ts` again) is intentional
  defense-in-depth, not an oversight or duplicated logic to simplify.

Sources read: `src/modules/document/presentation/dto/list-query.dto.ts`,
`src/modules/document/application/support/list-query.parser.ts`,
`src/modules/document/application/support/filter-query.parser.ts`,
`src/modules/document/infrastructure/persistence/sql/where-builder.ts`,
`src/modules/document/presentation/validate-params.ts`,
`src/bootstrap/configure-app.ts`.
