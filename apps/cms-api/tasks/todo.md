# Todo — GraphQL Contract Parity Pass

See `tasks/plan.md` for full context, dependency graph, and rationale. See `SPEC.md` for the full contract.

## Phase 1 — Breaking renames (Areas 1 + 2)
- [x] Task 1.1 — Pluralize `listQueryName` in `graphql/domain/naming.ts` (`<slug>List` → `<pluralSlug>`); rewrite `naming.spec.ts`
- [x] Task 1.2 — Rename `Id` → `documentId` across `schema-builder.service.ts` (query + 4 mutations) and `resolver-factory.service.ts` (arg types + read sites + error string); update e2e query strings
- [x] **Checkpoint A:** full e2e green — commit (covers Tasks 1.1 + 1.2)

## Phase 2 — List envelope + pagination + orderBy default (Areas 3 + 4 + 8)
- [x] Add `PaginationInput`/`PaginationMeta`/`ListMeta` SDL (as split-out named constants) + `<Type>List` envelope type; rewrite `buildListQueryField`
- [x] Rewrite `list-args.translator.ts`: `pagination` arg replaces `start`/`size`; implement SPEC §3.3's 13-rule validation table with exact error strings; default order-by column → `createdAt`
- [x] Resolver: build `{ items, meta: { pagination } }` envelope, computing `page`/`pageSize` post-resolution (incl. `limit: -1` unlimited case)
- [x] `prisma-document.repository.ts`: additive branch in `listPaginated` to omit `LIMIT` when `opts.size === -1`
- [x] Rewrite e2e list-query block for envelope shape; add all 13 pagination-rule cases + `limit: -1` case
- [x] **Checkpoint:** all checks green — commit (note deliberate default-limit change 20→10 in message)

## Phase 3 — `DateTime` scalar + system fields on `<Type>` (Area 9)
- [x] New `graphql/domain/date-time-scalar.ts` (mirrors `json-scalar.ts`) + `date-time-scalar.spec.ts`
- [x] `schema-builder.service.ts`: add `scalar DateTime`; `buildObjectType` appends `createdAt`/`updatedAt`/`publishedAt`
- [x] `resolver-factory.service.ts`: register `DateTime` scalar; `toResolverValue` stops dropping the 3 timestamp fields
- [x] `list-documents-full.service.ts`: items mapper stops dropping the 3 timestamp fields
- [x] Extend e2e assertions (single/list/mutation) for real ISO timestamps
- [x] **Checkpoint:** all checks green — commit

## Phase 4 — Expanded operators + system-field filters (Areas 5 + 7)
- [x] `document/domain/entities/filter.ts`: widen `FilterOperator` with `$in`/`$notIn`
- [x] `where-builder.ts`: add `$in`/`$notIn` branches to `buildFilterWhere` (confirmed shared-file edit)
- [x] `schema-builder.service.ts`: `TextFilter`/`NumberFilter` gain `in`/`notIn`; add `IDFilter`/`TimeFilter`; `buildFilterType` prepends system-field filters
- [x] `list-args.translator.ts`: add `in`/`notIn` operator mapping; add system-field (documentId/createdAt/updatedAt/publishedAt) filter resolution
- [x] Extend e2e list-query block with `in`/`notIn` + system-field filter cases
- [x] **Checkpoint:** all checks green — commit

## Phase 5 — Filter combinators `and`/`or`/`not` (Area 6)
- [x] `filter.ts`: add `FilterNode` discriminated union
- [x] `where-builder.ts`: new additive `buildFilterTree` (existing flat builder untouched)
- [x] `document.repository.ts`: `ListOptions` gains optional `filterTree` (REST never populates it)
- [x] `prisma-document.repository.ts`: additive AND-onto-existing branch in `listPaginated` when `filterTree` present
- [x] `list-documents-full.service.ts`: `FullListOptions` gains `filterTree`
- [x] `list-args.translator.ts`: `resolveFilters` → recursive `resolveFilterNode`, single root `FilterNode` always returned
- [x] `schema-builder.service.ts`: `buildFilterType` appends self-referencing `and`/`or`/`not`
- [x] New unit spec for `buildFilterTree` (nested AND/OR/NOT parenthesization)
- [x] e2e: SPEC §3.5 example combinator query against real seeded rows
- [x] Explicit re-run confirming REST's document e2e/unit suites unaffected
- [x] **Final checkpoint:** `bun run build && bun run lint && bun run test:cov && bun run test:e2e` green; walk SPEC §7 checklist bullet-by-bullet — commit
