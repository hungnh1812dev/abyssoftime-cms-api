# Spec

## Feature: Document list — API filter params (collection-type)

### Context

`GET /api/v1/documents/collection-type/:slug` (`list-query.parser.ts` / `where-builder.ts` /
`PrismaDocumentRepository.listPaginated`) already supports `start`/`size`/`orderBy`/`sortDir` and a
single `search` substring match (ILIKE, OR'd across the content type's `text`/`richtext` list
fields). There is no per-field filter capability — a caller can't ask for e.g. `status = "active"`
or `age >= 18`. This cycle adds that as `filters[field][$op]=value` query params on that same route,
following the same "validate against an allowlist, then build parameterized SQL" pattern the module
already uses for `orderBy` and `search`.

### Confirmed decisions

1. **Scope**: `GET /api/v1/documents/collection-type/:slug` only. Not the read-only content-type
   list route, not the public document routes (which have no list endpoint at all today), not
   single-type (no list concept — at most one row).
2. **Syntax**: Strapi-style nested bracket notation, e.g. `filters[title][$contains]=engineer`,
   `filters[age][$gte]=18`. Express's default `qs` query parser already turns this into
   `{ filters: { title: { $contains: "engineer" } } }` with zero custom parser config. Multiple
   fields AND together; one operator per field per request (repeating a field with two operators,
   e.g. a `$gte`+`$lte` range on the same field, is not supported this cycle).
3. **Operators (minimal set)**: `$eq`, `$ne`, `$contains` (text/richtext only — case-insensitive
   ILIKE, reusing `where-builder.ts`'s existing `escapeSearchValue`), `$gt`/`$gte`/`$lt`/`$lte`
   (number fields + the timestamp system columns). No `$in`, `$null`, `$startsWith`, `$endsWith`, or
   OR-group operators (`$or`/`$and`) this cycle.
4. **Filterable fields** = the same allowlist `sortableColumnsFor` already produces: system columns
   (`id`, `document_id`, `created_at`, `updated_at`, `published_at`) plus `text`/`number`/`boolean`
   content fields. Reused, not duplicated. `json`/`media`/`component` fields are never filterable,
   matching the existing sortable/searchable precedent.
5. **Operator-to-type gating**: a field's declared type restricts which operators are legal for it —
   `$contains` only on `text`/`richtext`; `$gt`/`$gte`/`$lt`/`$lte` only on `number` fields and the
   timestamp system columns; `$eq`/`$ne` on all filterable types. An unknown field, an unknown `$op`
   key, or an operator illegal for that field's type → `400 BadRequestException` at parse time,
   never silently dropped or passed through to raw SQL unvalidated (same discipline as the existing
   `orderBy` check).
6. **Value coercion**: query values arrive as strings. `number` field values are `Number()`-coerced
   with a finite-number check (400 on failure); `boolean` field values accept literal `"true"`/
   `"false"` only (400 otherwise); `text`/timestamp values pass through as strings. All values are
   bound as parameterized placeholders — never string-interpolated into SQL, same as `search`.
7. **`ListQueryDto`**: add `filters?: Record<string, Record<string, string>>`, `@IsOptional()
   @IsObject()` only — a shape gate, not field-level validation, matching `save-document.dto.ts`'s
   existing "DTO does shape, parser does the real validation" precedent.
8. **Plumbing**: `ListOptions`, `IDocumentRepository.listPaginated`, and
   `PrismaDocumentRepository.listPaginated` gain a parsed/validated `filters` field
   (`{ column, operator, value }[]`), AND'd into the existing `whereSql`/`whereParams` chain
   alongside `version = $1` and the `search` clause, reusing the same running-placeholder-index
   counting already there.
9. **Swagger**: `@ApiPropertyOptional` on the new DTO field documents the bracket syntax and lists
   the supported operators, matching the module's existing full-annotation-coverage precedent.
10. **Interaction with `search`**: both may be present in the same request; they combine as
    independent ANDed clauses — no special-casing needed since both already append to the same
    `whereSql`/`whereParams` chain.

### Out of scope / deferred

- `$or`/`$and` groups or any nested filter tree — AND-only across top-level fields this cycle.
- `$in`, `$null`, `$startsWith`, `$endsWith`, and other extended operators.
- Multiple operators on the same field in one request (range queries via repeated `$gte`+`$lte`).
- Filtering on `json`/`media`/`component`-typed fields.
- Filtering on the content-type list route or any public document route.

See `/docs/documents/document.md` for the implemented state once this lands.
