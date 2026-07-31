# Plan: GraphQL Contract Parity Pass

See `SPEC.md` for the full spec (objective, confirmed decisions, contract details, success criteria).

## Context

`SPEC.md` closes nine gaps between the dynamic GraphQL module (`src/modules/graphql/**`) and a Go reference implementation newly ported into `docs/golang/{graphql.md,graphql-list-api-spec.md,guide.md}`. No real consumer touches `/graphql` yet (`cms-admin` doesn't), so these are straight breaking renames, not additive aliases. This plan slices those nine areas into dependency-ordered, vertically-complete tasks.

**Decisions locked in before this plan** (resolving `SPEC.md`'s open items):
- New scalar name: **`DateTime`** (not Go's `Time`).
- `and`/`or`/`not` nesting depth: **unbounded** for this pass — revisit only if abuse/perf issues appear.
- `in`/`notIn` support requires editing the body of the shared `where-builder.ts`'s `buildFilterWhere` — **confirmed to proceed** (REST's own operator allowlist never emits `$in`/`$notIn`, so it's runtime-safe for REST).
- `SHARED_FILTER_AND_ORDER_TYPES` in `schema-builder.service.ts` (currently one inline SDL template string) — **split into a few named constants** (e.g. `PAGINATION_TYPES`, `FILTER_INPUT_TYPES`) as it grows across phases, rather than one ever-growing blob.

**Key finding from investigation** (corrects an assumption in `SPEC.md`'s own cross-module-impact table): `FullListOptions`/`where-builder.ts`'s flat filter builder is **not** the bottom of the stack. Both REST and GraphQL funnel into a shared `ListOptions` interface (`document/domain/repositories/document.repository.ts`) consumed by one `listPaginated()` implementation (`document/infrastructure/persistence/prisma-document.repository.ts:85-118`), which calls `buildFilterWhere` directly and builds `LIMIT $N OFFSET $N` with no branching for negative/unlimited limits. This means:
- The `and`/`or`/`not` work (Phase 5) must add a new **optional** `filterTree` field to `ListOptions` and a small additive branch in `listPaginated`, not just a new function in `where-builder.ts`.
- The `limit: -1` "unlimited" pagination case (Phase 2) needs a conditional in `listPaginated` to omit the `LIMIT` clause — Postgres rejects a negative `LIMIT`. REST's own `parseSize` can never produce `-1` (throws outside `1..100`), so this branch is dead code for REST and purely additive for GraphQL.

Also good news that shrinks scope: `ListDocumentsFullResult` **already carries `total`** — the pagination-meta plumbing `SPEC.md` assumes is new is really just currently discarded by the resolver. And `DocumentEntity` **already carries `createdAt`/`updatedAt`/`publishedAt`** as real `Date`s (populated by `row-mapper.ts` from real DB columns) — exposing them via GraphQL is two mapping-function edits, not a data-layer change.

## Dependency graph

```
Phase 1 (Areas 1, 2 — naming pluralization, documentId rename)
   │  independent of everything else; must land first since every later
   │  phase's e2e assertions read the new names/args.
   ▼
Phase 2 (Areas 3, 4, 8 — list envelope, PaginationInput + 13 rules, orderBy default)
   │  one cohesive rewrite of list-args.translator.ts; must precede Phase 3
   │  since Phase 3's e2e assertions build on the new envelope shape.
   ▼
Phase 3 (Area 9 — DateTime scalar + system fields on <Type>)
   │  must precede Phase 4: TimeFilter is typed DateTime.
   ▼
Phase 4 (Areas 5, 7 — in/notIn, IDFilter, TimeFilter, system-field filters)
   │  must precede Phase 5: SPEC's own combinator example filters on
   │  documentId inside an and/or block, needs the full Filter shape wired.
   ▼
Phase 5 (Area 6 — and/or/not combinators)
      reaches into document module (ListOptions.filterTree, prisma-document.repository.ts).
```

---

## Phase 1 — Breaking renames (Areas 1 + 2)

### Task 1.1 — List query name pluralization

**Description:** `graphql/domain/naming.ts` — rewrite `listQueryName` to pluralize instead of appending `List`: append `es` if the camelCase name ends in `s`/`x`/`z`/`ch`/`sh` (case-insensitive), else append `s`. No irregular plurals.

**Acceptance criteria** (SPEC §7 bullet 1):
- No `<slug>List` name remains in the generated schema for any collection content type.
- `listQueryName("blog-post") === "blogPosts"`, `listQueryName("en-it-vocab") === "enItVocabs"`.

**Verification:** `graphql/domain/naming.spec.ts` rewritten cases; `test/graphql.e2e-spec.ts` introspection block (~line 668) asserts old name absent / new name present.

### Task 1.2 — `documentId` arg rename

**Description:**
- `schema-builder.service.ts`: `buildQueryField` (~195) and `buildMutationFields` (~172-176) — all `Id: ID!` → `documentId: ID!`.
- `resolver-factory.service.ts`: `SingleQueryArgs`/`UpdateMutationArgs`/`IdMutationArgs` (~41-61) and every `args.Id` read site → `args.documentId`; also rename `assertValidDocumentId`'s error string (~line 77, `Invalid Id:` → `Invalid documentId:`) for consistency.
- `test/graphql.e2e-spec.ts`: single-query (~226), mutation-lifecycle (~456), media-mutation (~558) blocks — `Id:` → `documentId:`.

**Acceptance criteria** (SPEC §7 bullet 2): every `Id` arg (1 query + 4 mutations per type) renamed, no bare `Id:` left in the schema.

**Verification:** `resolver-factory.service.spec.ts` + `schema-builder.service.spec.ts` rewritten assertions; e2e mutation lifecycle green.

**✅ CHECKPOINT A** — confirm both renames land cleanly and the full e2e suite passes. Commit once here (covers both tasks — batch at checkpoint boundary).

---

## Phase 2 — List envelope + pagination + orderBy default (Areas 3 + 4 + 8)

One task — splitting envelope from pagination rewrite would mean building `meta.pagination` twice.

**Description:**
- `schema-builder.service.ts`: add (as new split-out named constants) `PaginationInput`, `PaginationMeta`, `ListMeta` SDL types; add `type <Type>List { items: [<Type>!]! meta: ListMeta! }` per collection type; rewrite `buildListQueryField` (~198-201) to `(where, orderBy, pagination: PaginationInput): <Type>List!`, dropping `start`/`size`.
- `list-args.translator.ts`: replace `ListArgsInput`'s flat `start`/`size` with `pagination?: PaginationInput`; replace `resolveStart`/`resolveSize` with one `resolvePagination` implementing SPEC §3.3's 13-row table in order, exact error strings (`"cannot mix offset (start/limit) and page (page/pageSize) modes"`, etc.); change `DEFAULT_ORDER_BY` (~line 16) from `"id"` to `"createdAt"` (already alias-mapped via `SYSTEM_ORDER_BY_ALIASES`).
- `resolver-factory.service.ts`: list resolver (~191-196) builds `{ items, meta: { pagination: { page, pageSize, total } } }` instead of returning bare `result.items`; compute `page`/`pageSize` per SPEC's post-resolution rule (`limit == -1` ⇒ `page:1, pageSize:total`; else `page = floor(start/limit)+1, pageSize = limit`).
- `document/infrastructure/persistence/prisma-document.repository.ts`: `listPaginated` (~108-115) — additive branch: when `opts.size === -1`, omit the `LIMIT` clause (keep `OFFSET`).
- `test/graphql.e2e-spec.ts`: rewrite list-query block (~285-331) for envelope shape; add cases for all 13 pagination rules with exact error strings, plus a `limit: -1` case asserting `pageSize === total`.

**Acceptance criteria** (SPEC §7 bullets 3, 4, 7): envelope shape everywhere; all 13 rules pass with exact strings; unlimited works; default sort `createdAt DESC`; multi-field `orderBy` still throws unchanged.

**Verification:** `list-args.translator.spec.ts` (13+ new cases), `schema-builder.service.spec.ts`, `resolver-factory.service.spec.ts`, e2e list-query block, spot-check `prisma-document.repository`'s unlimited branch (unit spec if one exists for that file, else covered via e2e).

**✅ Checkpoint / commit** after this phase. Call out explicitly in the commit message: default `limit` changes 20 → 10 (deliberate, per SPEC decision, not a bug).

---

## Phase 3 — `DateTime` scalar + system fields on `<Type>` (Area 9)

**Description:**
- New `graphql/domain/date-time-scalar.ts`, mirroring `json-scalar.ts`'s `GraphQLScalarType` pattern: `serialize` does `Date → toISOString()`; `parseValue`/`parseLiteral` validate ISO-8601 and return a `Date`.
- `schema-builder.service.ts`: add `scalar DateTime` (shared, once); `buildObjectType` (~83-90) appends `createdAt: DateTime!`, `updatedAt: DateTime!`, `publishedAt: DateTime`.
- `resolver-factory.service.ts`: register `DateTime: DateTimeScalar` alongside existing `JSON` registration (~line 271); `toResolverValue` (~71-73) stops dropping `createdAt`/`updatedAt`/`publishedAt` from the entity.
- `document/application/services/list-documents-full.service.ts`: same fix in the `items` mapper (~40-46) — it has the identical drop.
- New `graphql/domain/date-time-scalar.spec.ts` mirroring `json-scalar.spec.ts`.
- `test/graphql.e2e-spec.ts`: extend single-query/list-query/mutation-lifecycle assertions to check these three fields resolve to real ISO timestamps.

**Acceptance criteria** (SPEC §7 bullet 8): every generated `<Type>` exposes the three fields via `DateTime`, resolving real timestamps.

**Verification:** new scalar spec, schema-builder/resolver-factory/list-documents-full specs, e2e assertions.

**✅ Checkpoint / commit** after this phase — additive, low risk.

---

## Phase 4 — Expanded operators + system-field filters (Areas 5 + 7)

**Description:**
- `document/domain/entities/filter.ts`: widen `FilterOperator` union to add `"$in" | "$notIn"`.
- `document/infrastructure/persistence/sql/where-builder.ts`: `buildFilterWhere` gains `$in`/`$notIn` SQL branches (`= ANY($n)` / `NOT (... = ANY($n))`) — confirmed OK to edit this shared function directly.
- `schema-builder.service.ts`: `TextFilter`/`NumberFilter` gain `in`/`notIn`; add `IDFilter { eq ne in notIn }` and `TimeFilter { eq ne }` (using `DateTime` from Phase 3); `buildFilterType` (~180-184) prepends `documentId: IDFilter`, `createdAt/updatedAt/publishedAt: TimeFilter`.
- `list-args.translator.ts`: `OPERATORS_BY_FIELD_TYPE` gains `in`/`notIn` for text/number; new operator-arg mapping (`in → "$in"`, `notIn → "$notIn"`); `resolveFilters` gains a system-field lookup (documentId/createdAt/updatedAt/publishedAt → real DB column, reusing/extending `SYSTEM_ORDER_BY_ALIASES`'s existing pattern).
- `test/graphql.e2e-spec.ts`: extend list-query block with `in`/`notIn` cases and `documentId`/`createdAt` system-field filter cases against real seeded rows.

**Acceptance criteria** (SPEC §7 bullets 5, 6 partial): `<Type>Filter` includes the 4 system fields; `TextFilter`/`NumberFilter` support `in`/`notIn`; `IDFilter`/`TimeFilter` exist with documented operators.

**Verification:** `where-builder.spec.ts` new cases (additive), `list-args.translator.spec.ts` new cases, `schema-builder.service.spec.ts` new SDL assertions, e2e filter cases.

**✅ Checkpoint / commit** after this phase.

---

## Phase 5 — Filter combinators `and`/`or`/`not` (Area 6)

The one area reaching into the `document` module.

**Description:**
- `document/domain/entities/filter.ts`: add `FilterNode = ParsedFilter | { and: FilterNode[] } | { or: FilterNode[] } | { not: FilterNode }`.
- `document/infrastructure/persistence/sql/where-builder.ts`: new exported `buildFilterTree(node, paramIndex)` — recursive, correct parenthesization, reuses leaf-level operator logic (incl. Phase 4's `$in`/`$notIn`). Existing flat `buildFilterWhere` untouched by this task.
- `document/domain/repositories/document.repository.ts`: `ListOptions` gains optional `filterTree?: FilterNode` (REST never populates it).
- `document/infrastructure/persistence/prisma-document.repository.ts`: `listPaginated` — additive branch: when `opts.filterTree` is set, AND its SQL onto the existing `whereSql`/`whereParams`.
- `document/application/services/list-documents-full.service.ts`: `FullListOptions` gains `filterTree?: FilterNode`.
- `list-args.translator.ts`: `resolveFilters` becomes recursive (`resolveFilterNode`) — `and`/`or` keys recurse into array elements, `not` recurses into one nested object, any other key resolves as a leaf (reusing Phase 4's field/operator/column resolution); all entries at a level implicitly ANDed (per SPEC §3.5), always returning one root `FilterNode` (single code path, no simple/tree split).
- `schema-builder.service.ts`: `buildFilterType` appends self-referencing `and: [<Type>Filter!]`, `or: [<Type>Filter!]`, `not: <Type>Filter`.
- New unit spec for the tree builder (nested AND/OR/NOT → correct parenthesization), additive alongside existing `where-builder.spec.ts`.
- `test/graphql.e2e-spec.ts`: new cases reproducing SPEC §3.5's example (`and`/`or` nesting with `documentId: {in:...}`, `featured: {eq:true}`, `title: {contains:...}`) against real seeded rows.

**Acceptance criteria** (SPEC §7 bullet 5, combinator portion): `<Type>Filter` gains `and`/`or`/`not` reachable only via `where`; combinators resolve correctly against real rows; REST's own filter/list e2e and unit suites remain green with zero file edits (spot-check explicitly, since the shared `FilterOperator`/`ListOptions` types did change).

**Verification:** new where-builder tree spec, translator recursive-resolver cases, e2e combinator cases, explicit re-run of REST's document e2e/unit suites.

**✅ Final checkpoint** — run the full gate (`bun run build && bun run lint && bun run test:cov && bun run test:e2e`), walk SPEC §7's checklist bullet-by-bullet, then commit.

---

## Commit granularity

5 commits total, one per phase (Phase 1 covers 2 SPEC areas, Phase 2 covers 3, Phases 3/4/5 cover 1/2/1) — matches the project's "batch commits at checkpoint boundaries" convention and lines up with the two real ask-first gates (Phase 4's shared-file edit, already confirmed; Phase 5's cross-module reach).

## Verification (per phase and overall)

- Per task: relevant unit spec(s) green.
- Per phase checkpoint: `bun run build`, `bun run lint`, `bun run test:cov`, `bun run test:e2e` all green before committing.
- Final: `SPEC.md` §7 checklist fully checked off; REST paths (list/filter endpoints, their e2e suites) verified unaffected despite shared-type changes in Phases 4-5.
