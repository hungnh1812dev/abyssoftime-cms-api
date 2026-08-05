# Plan: GraphQL Media-Field N+1 Fix

See `docs/specs/graphql-media-field-n-plus-one.md` for the full spec (objective, decision rationale,
scope). This plan implements it, with one addition found during planning (below).

## Context

An N+1 audit of the API found one real remaining N+1 (the document/component I/O batching work was
already fixed in a prior project): `collectMediaFieldResolvers`
(`src/modules/graphql/application/resolver-factory.service.ts:130-157`) registers a GraphQL field
resolver per object type with a `media` field. GraphQL calls a field resolver once per object in a
result set, so any list query (or single query touching a repeated component) selecting a `media` field
fires one `mediaAsset.findUnique` per object instead of one batched query for the whole response.

The spec already evaluated three approaches and the user chose the `dataloader` npm package: field
resolvers run independently, so fixing this needs per-request key collection across resolver
invocations in the same tick, not just a batched repository method. `GraphqlContextFactory.createContext()`
already runs once per request, making it the natural place to construct a fresh `DataLoader` instance
per request.

**Additional finding from this planning pass (not in the original spec):** `findByDocumentId` on
`IMediaAssetRepository`/`PrismaMediaRepository` is *only* called from the code being replaced
(`resolver-factory.service.ts:146`) — confirmed via full-repo grep. It is byte-for-byte identical to
`findById` (`prisma.mediaAsset.findUnique({ where: { documentId } })`), and `docs/documents/media.md:157`
already documents this duplication as deliberate ("kept as two named methods to match the source doc's
port shape"). Once the resolver switches to the DataLoader, `findByDocumentId` becomes dead code with
zero remaining callers. Per this repo's own rule against keeping confirmed-unused code, this plan
**deletes `findByDocumentId` outright** (interface + implementation + its 2 spec cases) rather than
leaving it orphaned — this overturns the existing documented rationale, called out here explicitly.

## Design

1. **`IMediaAssetRepository`** (`media-asset.repository.ts`): remove `findByDocumentId`; add
   `findByDocumentIds(documentIds: string[]): Promise<MediaAssetEntity[]>`.
2. **`PrismaMediaRepository`**: implement via one `findMany({ where: { documentId: { in: documentIds } } } })`;
   remove the old `findByDocumentId` method.
3. **`GraphqlContext`** (`graphql-context.factory.ts`): add `mediaAssetLoader: DataLoader<string, MediaAssetEntity | null>`.
   `GraphqlContextFactory` gains a constructor dep on `IMediaAssetRepository` (`@Inject(MEDIA_ASSET_REPOSITORY)`)
   and builds a **new** `DataLoader` instance inside `createContext()` (never shared across requests — a
   shared instance would leak cached values and grow unbounded). Batch function:
   ```ts
   new DataLoader<string, MediaAssetEntity | null>(async (ids) => {
     const found = await this.mediaAssets.findByDocumentIds([...ids]);
     const byId = new Map(found.map((asset) => [asset.documentId, asset]));
     return ids.map((id) => byId.get(id) ?? null);
   });
   ```
   (DataLoader's contract requires the returned array to be the same length/order as the input keys array;
   missing keys resolve to `null`, never an error or a thrown/rejected entry.)
4. **`resolver-factory.service.ts`**:
   - `MediaFieldResolver` type gains a `context: GraphqlContext` parameter.
   - `collectMediaFieldResolvers` drops its `mediaAssets: IMediaAssetRepository` parameter; the resolver
     body becomes `context.mediaAssetLoader.load(fk)` instead of `mediaAssets.findByDocumentId(fk)`.
   - `ResolverFactoryService` drops its own `mediaAssets` constructor dependency (both call sites of
     `collectMediaFieldResolvers`, lines 192 and 252, update accordingly).
5. **`graphql.module.ts`**: move the `MEDIA_ASSET_REPOSITORY` inject/param from `resolverFactory`'s
   construction to `contextFactory`'s (`new GraphqlContextFactory(accessTokens, mediaAssets)`); drop it
   from `new ResolverFactoryService(...)`'s arg list.
6. New dependency: `bun add dataloader` (no `@types/dataloader` needed — it ships its own types; verified
   `esModuleInterop: true` in `tsconfig.json` so a default import works).

## Proving the fix (key discovery from this planning pass)

No *production* content type currently has a `media` field on a `collection` (list-capable) type or on a
repeated component (`cv-contact.avatar` is the only real media field, and it's a `single`-kind type — one
document, so a list-query proof isn't possible against real seeds). However, `test/graphql.e2e-spec.ts`
already solves exactly this problem for its own single-item media test: it writes a **throwaway**
collection-kind content type file (`e2e-gql-media-${runId}.json`, slug `mediaSlug`, fields
`title`/`cover: media`) to `content-types/` in `beforeAll`, boots the real app against real Postgres so it
loads into the live GraphQL schema, and deletes the file + re-syncs in `afterAll`
(`test/graphql.e2e-spec.ts:104-114, 133-137, 214-218`). Its existing
`describe("media field resolution (throwaway media-bearing content type)")` block (line 581) already
uploads media and creates/publishes one document of this type for single-item query tests.

This plan extends that same block with a **list-query** case: seed 3 documents of `mediaSlug`, each with
its own uploaded media asset, publish them, run `listQueryName(mediaSlug)` selecting `cover { documentId }`
over real HTTP, and assert batching by spying on the real DI-resolved repository instance
(`jest.spyOn(app.get(MEDIA_ASSET_REPOSITORY), "findByDocumentIds")`) — asserting it was called **exactly
once**, with all seeded FKs in one call. This is simpler and more precise than the spec's original idea of
Prisma query-event logging, and matches this test file's existing `app.get(...)` patterns.

## Verification

- Unit: `bun run test:cov` — new/updated specs for `PrismaMediaRepository`, `GraphqlContextFactory`,
  `ResolverFactoryService` all green, no coverage regressions.
- E2E: `bun run test:e2e` — the new list-query batching assertion in `graphql.e2e-spec.ts` is the actual
  proof this fixes the reported N+1 (one `findByDocumentIds` call, not N `findByDocumentId` calls) end to
  end through real Apollo resolver execution and real Postgres.
- `bun run build` and `bun run lint` clean throughout.

## Files not touched

`document`/`component` modules (already fixed, separate spec), any REST endpoint, GraphQL schema/SDL
shape (`schema-builder.service.ts` untouched — only resolver wiring changes), any content type other than
the existing throwaway e2e fixture.
