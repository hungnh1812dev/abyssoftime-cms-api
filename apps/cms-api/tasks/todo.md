# Todo — GraphQL Media-Field N+1 Fix

See `tasks/plan.md` for full context, design, and rationale. See
`docs/specs/graphql-media-field-n-plus-one.md` for the full spec.

## Phase 1 — Batching fix
- [x] Task 1 — `IMediaAssetRepository`/`PrismaMediaRepository`: remove `findByDocumentId` (byte-for-byte duplicate of `findById`, becomes dead code once the resolver switches to the loader); add `findByDocumentIds(documentIds: string[]): Promise<MediaAssetEntity[]>` via one `findMany({ where: { documentId: { in: documentIds } } } })`. Tests: multiple ids, partial matches, empty-array input.
- [x] Task 2 — `bun add dataloader`. `GraphqlContextFactory`: inject `IMediaAssetRepository`; `createContext()` builds a fresh `DataLoader<string, MediaAssetEntity | null>` per call (batch fn calls `findByDocumentIds`, maps results back in key order, missing ids → `null`); add `mediaAssetLoader` to `GraphqlContext`. Tests: loader present on context, two calls return distinct instances (never shared), `load(id)` resolves correctly via the mocked repository, missing id resolves to `null` not a rejection.
- [x] Task 3 — `resolver-factory.service.ts`: `MediaFieldResolver` gains a `context` param; `collectMediaFieldResolvers` drops its `mediaAssets` param, resolver body becomes `context.mediaAssetLoader.load(fk)`; `ResolverFactoryService` drops its `mediaAssets` constructor dep. `graphql.module.ts`: move `MEDIA_ASSET_REPOSITORY` wiring from `resolverFactory` construction to `contextFactory` construction. Tests: update `resolver-factory.service.spec.ts`'s media-field-resolution block for the new context-based call signature; update `graphql.module.spec.ts` if it asserts the old wiring.
- [x] **Checkpoint A:** `bun run build && bun run lint && bun run test:cov` green — commit.

## Phase 2 — E2E proof
- [x] Task 4 — `test/graphql.e2e-spec.ts`: extend the "media field resolution (throwaway media-bearing content type)" describe block with a list-query case — seed 3 `mediaSlug` documents, each with its own uploaded media asset, publish each; spy `jest.spyOn(app.get(MEDIA_ASSET_REPOSITORY), "findByDocumentIds")`; run one `listQueryName(mediaSlug)` query selecting `title cover { documentId fileName }`; assert correct data for all 3 documents AND the spy was called exactly once with all 3 FKs.
- [x] **Checkpoint B:** `bun run test:e2e` green — commit.

## Phase 3 — Docs + workflow closeout
- [ ] Task 5 — Update `docs/documents/graphql.md:138` (media field resolver line — describe DataLoader batching); update `docs/documents/media.md:46,125,157` (remove `findByDocumentId` references, document `findByDocumentIds`, drop the now-superseded "kept as two named methods" rationale).
- [ ] Task 6 — Run the five-axis review (correctness/readability/architecture/security/performance); delete `docs/specs/graphql-media-field-n-plus-one.md` as cleanup step.
- [ ] **Checkpoint C (final):** `bun run build && bun run lint && bun run test:cov && bun run test:e2e` all green; docs updated; spec cleaned up — commit.
