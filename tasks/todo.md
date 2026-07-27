# Todo — Document list API filter params

See `tasks/plan.md` for full context, approach, and confirmed decisions.

## Phase 1 — Filter primitives (SQL builder + parser), independently testable

- [x] `where-builder.ts` — add `FilterOperator` type (`"$eq" | "$ne" | "$contains" | "$gt" | "$gte" |
      "$lt" | "$lte"`), `ParsedFilter` interface (`{ column, operator, value }`), and
      `buildFilterWhere(filters: ParsedFilter[], paramIndex: number): { sql: string; params:
      unknown[] } | null`; empty array → `null`; AND-join each filter's clause; `$contains` reuses
      `escapeSearchValue` + `ILIKE ... ESCAPE '\'`; every other operator maps to its SQL comparator
      (`=`, `<>`, `>`, `>=`, `<`, `<=`); `quoteIdent` every column name
- [x] `where-builder.spec.ts` — tests: empty filters → `null`; single `$eq` filter SQL+params shape;
      `$contains` escaping/wildcarding; multiple filters AND'd with sequential placeholder indices;
      unsafe column name throws `UnsafeSqlIdentifierError` (defense-in-depth, mirrors existing
      `buildOrderByClause`/`buildSearchWhere` injection tests)
- [x] New `filter-query.parser.ts` — `parseFilters(contentType, rawFilters:
      Record<string, Record<string, string>> | undefined): ParsedFilter[]`; per field: must be in
      `sortableColumnsFor(contentType.fields)` else `400`; per operator: must be legal for that
      field's value class (text/number/boolean/id/document_id/timestamp — see `tasks/plan.md`'s
      Approach section) else `400`; exactly one operator per field, more than one throws `400`;
      value coercion per class, invalid value throws `400`; `undefined` input → `[]`
- [x] New `filter-query.parser.spec.ts` — tests: valid single/multi-field parse; unknown field → 400;
      unknown `$op` → 400; operator illegal for field class (e.g. `$contains` on `number`, `$gt` on
      `boolean`) → 400; two operators on one field → 400; non-numeric value for `number` → 400;
      non-`"true"/"false"` value for `boolean` → 400; unparseable date for a timestamp system column
      → 400; `undefined` → `[]`
- [x] **Checkpoint 1:** `bun run build && bun run test src/modules/document/infrastructure/persistence/sql/where-builder.spec.ts src/modules/document/application/support/filter-query.parser.spec.ts && bun run lint`
      green (also ran the full `src/modules/document` suite: 210 tests, 29 suites, no regressions);
      confirm staged files + commit message with user before committing

## Phase 2 — Wire into the list request path (one full vertical slice)

- [ ] `document.repository.ts` — `ListOptions` gains `filters: ParsedFilter[]`
- [ ] `list-query.parser.ts` — `ListQueryParams` gains `filters?: Record<string, Record<string,
      string>>`; `parseListQuery` calls `parseFilters(contentType, query.filters)` and includes the
      result in the returned `ListOptions`
- [ ] `list-query.parser.spec.ts` — add cases: no `filters` in query → `filters: []`; valid `filters`
      → parsed array present in the returned options; an invalid filter throws `400` from within
      `parseListQuery` itself
- [ ] `prisma-document.repository.ts` — `listPaginated`: after the existing `search` clause, call
      `buildFilterWhere(opts.filters, whereParams.length + 1)` and AND its `sql` into `whereSql`,
      push its `params`; applies to both the count query and the data query (shared `whereSql`/
      `whereParams`, one change point)
- [ ] `prisma-document.repository.spec.ts` — add cases: filters set → only matching rows/correct
      `total`; empty `filters` → identical behavior to today (no regression); `filters` + `search`
      together → AND, not either/or
- [ ] `list-query.dto.ts` — add `filters?: Record<string, Record<string, string>>`,
      `@IsOptional() @IsObject()` only (shape gate, matches `save-document.dto.ts` precedent);
      `@ApiPropertyOptional` documenting the bracket syntax + supported `$op` set per field class
- [ ] **Checkpoint 2:** `bun run build && bun run test:cov && bun run lint` green (no new
      `coverageThreshold` entries for the Prisma repository or controller, per
      `docs/rules/workflow.md`); manual smoke test via `bun run start:dev` + `curl` against a real
      dev DB: `GET .../cv-page?filters[position][$contains]=...` and
      `GET .../cv-page?filters[isMain][$eq]=true`, confirm 200 + correctly filtered rows, and check
      `/api-docs` shows the new param; confirm before committing

## Phase 3 — e2e proof, docs, spec cleanup, review

- [ ] `test/content-engine.e2e-spec.ts` — extend list assertions against the real `cv-page` seed
      (`position`:text, `isMain`:boolean, both real non-throwaway fields): `$contains` on `position`,
      `$eq` on `isMain`, a filter combined with `search`, and one `400` case (invalid field or
      operator) — real HTTP route + real Postgres. If the timestamp-cast risk flagged in
      `tasks/plan.md` surfaces here, fix `buildFilterWhere`'s timestamp branch with an explicit
      `CAST($n AS timestamptz)` and re-run
- [ ] `docs/documents/document.md` — extend the "List query parsing" section with the new `filters`
      mechanism (operators, value classes, 400 cases), mirroring how `search`/`orderBy` are
      documented there
- [ ] `docs/documents/swagger.md` — check whether the new query param needs a mention (not a new
      endpoint, so likely no change beyond a path/operation-count bump if one is tracked there;
      confirm during execution)
- [ ] **Checkpoint 3 (final):** `bun run build && bun run test:cov && bun run test:e2e && bun run
      lint` all green; five-axis code review (`agent-skills:code-reviewer`) over the full diff — fix
      or explicitly defer findings with reasoning; `SPEC.md` trimmed to a one-line pointer at
      `docs/documents/document.md`, per "Root docs" rule; confirm final commit(s) with user
