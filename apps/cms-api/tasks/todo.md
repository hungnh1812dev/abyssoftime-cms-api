# Todo — Dynamic GraphQL API

See `tasks/plan.md` for full context, dependency graph, and rationale.

## Phase 1 — Foundation + minimal single-query vertical slice
- [x] Task 1.1 — Install `@nestjs/graphql`/`@nestjs/apollo`/`@apollo/server`/`graphql`; module skeleton + boot wiring + dev-only introspection gating
- [x] Task 1.2 — `field-type-mapping.ts` + `naming.ts` (pure, unit-tested)
- [x] Task 1.3 — Additive exports: `ContentTypeModule` (`SchemaLoaderService`), `DocumentModule` (`GetPublicDocumentService`, `GetDocumentForEditService`)
- [x] Task 1.4 — `schema-builder.service.ts`: scalar-only SDL + single query
- [x] Task 1.5 — `graphql-context.factory.ts` + `authorize.util.ts` (Bearer token, never throws on absent token)
- [x] Task 1.6 — `resolver-factory.service.ts`: single-query resolver + real `graphql.module.ts` wiring
- [x] **Checkpoint 1:** `bun run build` / `tsc --noEmit` / `bun run lint` / `test:cov` green; manual `start:dev` walkthrough (published/draft, with/without token) — commit

## Phase 2 — List query
- [x] Task 2.1 — `ListDocumentsFullService` (new file, `document` module) — full-hydration, published-only, no listFields projection
- [x] Task 2.2 — `list-args.translator.ts`: GraphQL `where`/`orderBy` → `ParsedFilter[]`
- [x] Task 2.3 — SDL: `<Type>Filter`/`<Type>OrderBy` + list query; resolver wiring
- [x] **Checkpoint 2:** automated checks green; manual filter+orderBy+pagination check — commit

## Phase 3 — Media + component recursive resolution
- [x] Task 3.1 — `MediaModule` export + `MediaAsset` type + field resolver (dangling/null FK → `null`, never throws)
- [x] Task 3.2 — Recursive component SDL + resolvers (arbitrary nesting depth)
- [x] Task 3.3 — New `test/graphql.e2e-spec.ts`: full read-path e2e (real seeds + throwaway media-bearing content type)
- [x] **Checkpoint 3:** `bun run test:e2e` green; manual nested+media query — commit

## Phase 4 — Mutations (collection-type)
- [x] Task 4.1 — Export remaining collection services; SDL for `<Type>Input` + 5 mutations
- [x] Task 4.2 — Mutation resolvers + permission checks (create/update/delete/publish/unpublish; update re-reads after save)
- [x] Task 4.3 — e2e: full CRUD lifecycle + permission-denied cases
- [x] **Checkpoint 4:** `bun run test:e2e` green; manual full lifecycle via a real token — commit

## Phase 5 — Single-type support
- [ ] Task 5.1 — Export 5 single-type services; SDL + resolvers (query/save/publish/unpublish, no `Id`); e2e extension
- [ ] **Checkpoint 5:** full e2e suite + all automated checks green — commit

## Phase 6 — Hardening
- [ ] Task 6.1 — Error-shape audit (consistent `GraphQLError` codes); re-verify introspection gating; five-axis review; address findings
- [ ] **Checkpoint 6:** all checks green, findings addressed — commit

## Phase 7 — Docs + close-out
- [ ] Task 7.1 — `docs/documents/graphql.md` (new), confirm/update `graphql-techstack.md`, `docs/ENTRYPOINT.md` index entry, `SPEC.md` trimmed to pointer
- [ ] **Checkpoint 7 (final):** all checks green — commit — feature complete
