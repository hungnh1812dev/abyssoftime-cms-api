# Plan: Document list — API filter params (collection-type)

See `SPEC.md` for the active spec — binding source of truth for scope/boundaries below.

## Context

`GET /api/v1/documents/collection-type/:slug` (`list-query.parser.ts` / `where-builder.ts` /
`PrismaDocumentRepository.listPaginated`) currently supports `start`/`size`/`orderBy`/`sortDir` and a
single `search` substring match, but has no way to filter rows by a field's value (e.g.
`status = "active"`, `age >= 18`). This adds `filters[field][$op]=value` query params to that route,
reusing the module's existing "validate against an allowlist, then build parameterized SQL" pattern
already proven for `orderBy` and `search` — same defense-in-depth style (allowlist re-checked at both
the parse layer and the raw-SQL layer), same file layout (a `support/*.ts` parser + a
`where-builder.ts` SQL-builder), same DTO philosophy (shape gate only, real validation in the
parser).

Confirmed via direct reads of `list-query.parser.ts`, `where-builder.ts`,
`prisma-document.repository.ts`, `list-query.dto.ts`, `list-documents.service.ts`,
`collection-type-document.controller.ts`, `configure-app.ts` (global `ValidationPipe`), and the
real `cv-page`/`en-it-vocab` seed field definitions — no remaining unknowns.

## Confirmed decisions (from Spec phase, restated)

1. Scope: `GET /api/v1/documents/collection-type/:slug` only — not content-type list, not public
   document routes, not single-type.
2. Syntax: Strapi-style nested bracket notation `filters[field][$op]=value`, parsed for free by
   Express's default `qs` query parser into `{ filters: { field: { $op: value } } }`.
3. Operators: `$eq`, `$ne`, `$contains` (text only), `$gt`/`$gte`/`$lt`/`$lte` (number fields +
   timestamp system columns). AND-only across fields; one operator per field per request.
4. Filterable fields = the existing `sortableColumnsFor` allowlist (system columns +
   text/number/boolean content fields). Reused, not duplicated.
5. Operator-to-type gating: illegal operator for a field's type, unknown field, or unknown `$op` →
   `400 BadRequestException` at parse time, never silently dropped or passed through unvalidated.
6. Value coercion: `number` → finite JS `number`; `boolean` → literal `"true"`/`"false"` only;
   text/timestamp → string. All values bound as parameterized placeholders.
7. `ListQueryDto.filters` is a shape gate only (`@IsOptional() @IsObject()`), matching
   `save-document.dto.ts`'s existing precedent.
8. `filters` and `search` combine as independent ANDed clauses.

## Approach

**Column "value class" drives operator legality**, not just allowlist membership. Six classes,
mapped from `sortableColumnsFor`'s existing columns:

- `text` field → `$eq` `$ne` `$contains` (string value, `$contains` reuses `escapeSearchValue`)
- `number` field → `$eq` `$ne` `$gt` `$gte` `$lt` `$lte` (value coerced to a finite JS `number`)
- `boolean` field → `$eq` `$ne` (value must be literal `"true"`/`"false"`, coerced to JS `boolean`)
- `id` system column → `$eq` `$ne` only (coerced to `number`) — excluded from range ops per the
  spec's literal wording, even though `id` is numeric
- `document_id` system column → `$eq` `$ne` only (opaque UUID text, no coercion)
- `created_at`/`updated_at`/`published_at` → `$eq` `$ne` `$gt` `$gte` `$lt` `$lte` (value validated
  as a parseable date string via `new Date(value)`, bound as the original string — **confirmed at
  the Phase 3 e2e step against real Postgres**: the implicit text→timestamptz cast holds with no
  explicit `CAST` needed)

**Post-Phase-2 discovery, fixed in Phase 3**: `filters[field][$op]=value` requires Express's
"extended" (qs-based) query parser to arrive as a real nested object. Express 5 (this repo's actual
version) defaults to "simple" parsing, which kept the bracket notation as one flat string key —
`class-validator`'s `whitelist`/`forbidNonWhitelisted` then rejected it outright
(`"property filters[position][$contains] should not exist"`). Fixed with a global
`app.set("query parser", "extended")` in `configure-app.ts` (TDD'd, verified backward-compatible
against the full suite — "extended" is a superset of "simple" for every existing flat query param).
This invalidates the original assumption (stated in `SPEC.md`/this plan) that bracket-notation
parsing needed zero config in this repo.

**New file `application/support/filter-query.parser.ts`** (not folded into `list-query.parser.ts`)
mirrors the existing one-concern-per-file split (`draft-publish.policy.ts`, `status-resolver.ts`,
`component-io.service.ts` are all separate support files). Exports `parseFilters(contentType,
rawFilters)`, called once from `parseListQuery`.

**`where-builder.ts` gains the SQL-building half**: `FilterOperator` type, `ParsedFilter` interface
(`{ column, operator, value }`), and `buildFilterWhere(filters, paramIndex)` — same shape as the
existing `buildSearchWhere`, AND-joining each filter's clause, one parameter per filter (not a
shared placeholder like `search`, since each filter is a distinct value). Types live in
`where-builder.ts`, imported by both the parser and the Prisma repository — same direction
`sortableColumnsFor` already flows.

**No controller change needed** — `collection-type-document.controller.ts`'s `list()` already
forwards the whole `ListQueryDto` into `ListDocumentsService.execute` untouched; adding `filters` to
the DTO is enough to reach the parser.

Build order: Phase 1 (SQL builder + parser primitives, independently testable) → Phase 2 (wire into
`ListOptions`/repository/DTO — one full vertical slice) → Phase 3 (e2e proof against real Postgres +
docs + spec cleanup + review). Each phase verified (`bun run build`/`test`/`lint`) before its
checkpoint commit — see `tasks/todo.md`.
