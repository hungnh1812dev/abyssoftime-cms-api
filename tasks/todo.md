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

- [x] `document.repository.ts` — `ListOptions` gains `filters: ParsedFilter[]`
- [x] `list-query.parser.ts` — `ListQueryParams` gains `filters?: FilterQueryParams`; `parseListQuery`
      calls `parseFilters(contentType, query.filters)` and includes the result in the returned
      `ListOptions`
- [x] `list-query.parser.spec.ts` — added cases: no `filters` in query → `filters: []`; valid
      `filters` → parsed array present in the returned options; an invalid filter throws `400` from
      within `parseListQuery` itself. Also fixed `prisma-document.repository.spec.ts`'s hand-built
      `ListOptions` literal (missing `filters: []` — a `bun run build` type error `bun run test`
      alone didn't catch, since ts-jest here doesn't do full-project type-checking; caught it by
      running the build)
- [x] `prisma-document.repository.ts` — `listPaginated`: after the existing `search` clause, calls
      `buildFilterWhere(opts.filters, whereParams.length + 1)` and ANDs its `sql` into `whereSql`,
      pushes its `params`; applies to both the count query and the data query (shared `whereSql`/
      `whereParams`, one change point)
- [x] `prisma-document.repository.spec.ts` — added cases: filters set → only matching rows/correct
      `total` (asserted via the generated SQL/params, mocked DB); `filters` + `search` together →
      AND with independent placeholders, not either/or
- [x] `list-query.dto.ts` — added `filters?: FilterQueryParams`, `@IsOptional() @IsObject()` only
      (shape gate, matches `save-document.dto.ts` precedent); `@ApiPropertyOptional` documenting the
      bracket syntax + supported `$op` set per field class. Build caught a real Swagger-decorator
      type error along the way: `type: "object"` requires an explicit `additionalProperties` in this
      `@nestjs/swagger` version's typings — added `additionalProperties: true`
- [x] **Checkpoint 2:** `bun run build && bun run test:cov && bun run lint` green (no new
      `coverageThreshold` entries for the Prisma repository or controller). Manual smoke test via
      `bun run start:dev` against the real dev Postgres: app boots cleanly with the new route param
      registered, `GET /health` → 200, and `GET /api-docs-json` confirms the `filters` query param
      is present on the collection-type list route with the documented bracket syntax/operator set.
      Stopped short of an authenticated `curl` round-trip proving actual row filtering — this dev
      DB's `/auth/register` DTO wants fields unrelated to this feature to construct a fresh account,
      and existing dev credentials aren't known/available here. Deferred that exact proof (real
      HTTP route + real Postgres + auth) to Task 6's e2e suite, which uses
      `JwtTokenService.signAccessToken` directly (the existing e2e pattern) instead of a live
      register/login round-trip — a stronger, repeatable check than one-off `curl` would have been
      anyway; confirmed before committing

## Phase 3 — e2e proof, docs, spec cleanup, review

- [x] `test/content-engine.e2e-spec.ts` — new "list filter params (cv-page)" describe block:
      `$contains` on `position`, `$eq` on `isMain` combined with `$contains`, a filter combined with
      `search`, a `$gte` timestamp-column filter (`created_at`), and two `400` cases (unknown field,
      operator illegal for the field's type) — real HTTP route + real Postgres. The timestamp-cast
      risk flagged in `tasks/plan.md` did **not** surface — Postgres's implicit text→timestamptz
      cast held with no explicit `CAST` needed.
- [x] **Pre-existing bugs found and fixed along the way** (all confirmed via `git show --stat` that
      the `/api/v1` migration commit never touched test files, and via a temporary debug e2e test
      reproducing the exact 400 body):
      1. `bun run test:e2e` was already broken on `develop` (19/21 failing) — `content-engine.e2e-spec.ts`
         and `media.e2e-spec.ts` still called pre-`/api/v1`-migration routes; `app.e2e-spec.ts` still
         tested the old removed root `GET /` route instead of the `GET /health` that replaced it. Fixed
         and committed separately (`ed9baed`, confirmed with user first) before adding new assertions.
      2. **Real bug in this feature's own design**: `filters[field][$op]=value` requires Express's
         "extended" (qs-based) query parser to arrive as a nested object; Express 5 defaults to
         "simple" (no bracket nesting), which class-validator's `whitelist`/`forbidNonWhitelisted`
         then rejected as an unrecognized flat property (`"property filters[position][$contains]
         should not exist"`). SPEC.md's assumption that this "works with zero custom parser config"
         was wrong for this repo's actual Express version. Fixed with `app.set("query parser",
         "extended")` in `configure-app.ts`, TDD'd with a new `configureApp query parser` describe
         block in `configure-app.spec.ts` (a throwaway echo controller proving bracket-notation
         query params round-trip into a real nested object). This is a global, app-wide setting
         change — verified safe/backward-compatible by re-running the full suite (674 unit tests,
         22 e2e tests, build, lint) with no other regressions, since "extended" is a superset of
         "simple" for every existing flat (non-bracketed) query param already in use.
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
