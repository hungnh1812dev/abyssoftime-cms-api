# Spec: GraphQL Media-Field N+1 Fix

## Objective

An N+1 audit of the API (prompted by a general "does this API have N+1 issues?" check, after the
document/component I/O batching work was already closed out) found one real N+1 outside that
already-fixed path: the GraphQL media-field resolver.

`collectMediaFieldResolvers` (`src/modules/graphql/application/resolver-factory.service.ts:130-157`)
registers, for every object type with a `media`-typed field (the root document type or any nested
component type), a field resolver:

```ts
mediaFieldResolvers[field.name] = async (parent) => {
  const fk = parent[field.name];
  ...
  return mediaAssets.findByDocumentId(fk);
};
```

GraphQL invokes a field resolver once per object in the result set. For any list query
(`query[listQueryName(...)]`, wired at line 207) or single-item query whose selection includes a
`media` field — directly on the document or on a nested, possibly-repeated component — this fires one
`mediaAsset.findUnique` per object, scaling linearly with result size (and, for repeated components,
with item count within a single document too). `IMediaAssetRepository`
(`src/modules/media/domain/repositories/media-asset.repository.ts:16-22`) and `PrismaMediaRepository`
(`src/modules/media/infrastructure/persistence/prisma-media.repository.ts:23-26`) only expose a
single-record `findByDocumentId` — there is no batched lookup, unlike the document/component hydration
path fixed previously (`hydrateRows` batches by component path, per `docs/documents/document.md`).

This is the hottest remaining N+1: it sits directly on the public/edit content-listing GraphQL path
(`listDocumentsFull`, `getPublicDocument`, `getDocumentForEdit`).

**User:** any GraphQL consumer (`POST /graphql`) querying a list or single item that selects a `media`
field — the reported symptom is query-count/latency scaling with the number of returned documents (and
nested component instances), not a functional bug.

**Success looks like:** a query returning N documents (or N component instances) that each select a
`media` field issues **one** batched `mediaAsset` query for the whole response, not N — verified by an
integration/e2e assertion on query count, not just code inspection. No change to GraphQL response shape,
field names, or existing single-item behavior.

## Decision (confirmed with user)

Field resolvers execute independently per object — a `findByDocumentIds(ids)` batch method on the
repository alone does not fix this; something needs to **collect keys across the resolvers running
within one request tick** before issuing the batch query. Three approaches were weighed:

| Approach | Fit for this repo | Complexity | Maintenance cost | Precedent |
| --- | --- | --- | --- | --- |
| **`dataloader` npm package (chosen)** | High — this is exactly the problem it solves; request-scoped instance keyed by media `documentId` | Low — ~10 lines to instantiate, resolver body becomes `context.mediaAssetLoader.load(fk)` | Low — actively maintained, used by virtually every GraphQL-on-Node service, zero custom batching logic to own | None yet in this repo, but zero precedent for hand-rolled batching either |
| Hand-rolled microtask-deferred batch collector | Medium — solves it, but reimplements a well-known primitive | High — must get the "collect within a tick, dedupe keys, preserve per-key promise resolution" logic right and tested from scratch | High — a persistent, hand-maintained piece of infrastructure code for a solved problem | None |
| Eager-load media at list/hydration level (restructure `ListDocumentsFullService`/`GetDocumentForEditService` to batch-resolve media fields before GraphQL sees them, dropping the field-resolver approach) | Low — GraphQL's per-type field-resolver model exists precisely so types don't need to know about each other's hydration; forcing eager-load back into the document services re-couples `document` and `media` modules at the service layer | High — touches document module hydration paths shared by REST and GraphQL, larger blast radius than the actual bug | High — every future GraphQL-only relation would need the same treatment, permanently | Would contradict `graphql.md`'s existing design note that resolvers "delegate to existing services" without services knowing about GraphQL-specific concerns |

`dataloader` wins on every axis: it's the standard tool for exactly this shape of problem, keeps the fix
scoped to the `graphql` module (no `document`/`media` service changes), and adds a single well-known
dependency instead of new code to maintain.

Because `GraphqlContextFactory.createContext` (`src/modules/graphql/application/graphql-context.factory.ts`)
already runs once per request and builds a fresh `GraphqlContext`, it is the natural place to construct a
new `DataLoader` instance per request (per-request instance is required — a shared/singleton loader would
leak stale cached values and unbounded memory across requests).

## Scope

**In scope:**
- Add `dataloader` as a runtime dependency (`bun add dataloader`).
- `IMediaAssetRepository` (`media-asset.repository.ts`): add `findByDocumentIds(documentIds: string[]): Promise<MediaAssetEntity[]>`.
- `PrismaMediaRepository`: implement it via one `findMany({ where: { documentId: { in: documentIds } } } })`.
- `GraphqlContext` / `GraphqlContextFactory`: inject `IMediaAssetRepository`; add a `mediaAssetLoader: DataLoader<string, MediaAssetEntity | null>` to the context, constructed fresh per request, with a batch function that calls `findByDocumentIds` and maps results back to the DataLoader's required same-order-as-keys array contract (missing IDs resolve to `null`, not an error).
- `resolver-factory.service.ts`: `collectMediaFieldResolvers` stops taking `mediaAssets` and instead the `MediaFieldResolver` type gains a `context: GraphqlContext` parameter; the resolver body becomes `context.mediaAssetLoader.load(fk)`. `ResolverFactoryService` drops its own `mediaAssets` constructor dependency (no longer needed once loading moves into the context).
- `graphql.module.ts`: move the `MEDIA_ASSET_REPOSITORY` inject from `resolverFactory`'s construction to `contextFactory`'s.
- Existing unit tests touching these files (`resolver-factory.service.spec.ts`, `graphql-context.factory.spec.ts`, `graphql.module.spec.ts`, media repository specs) updated for the new signatures.
- A new integration-level assertion (e2e, real Postgres) proving a list query selecting a `media` field issues one batched query regardless of result size — see Testing Strategy.
- `docs/documents/graphql.md` and `docs/documents/media.md` updated to document the DataLoader/batching behavior.

**Out of scope:**
- Any other relation/field beyond `media` (there is currently only one cross-module FK-style field
  resolver in this GraphQL layer — `media`; no other N+1 was found in the audit).
- The document/component I/O batching work (already fixed, separate closed-out spec).
- REST endpoints — this resolver only exists on the GraphQL surface; REST media lookups already go
  through `findByDocumentId`/`findById` directly against a single document, no fan-out.
- Any change to GraphQL schema shape, field names, or response envelopes.
- Per-request caching/memoization beyond what `dataloader` provides by default.

## Tech Stack

NestJS 11, `@nestjs/graphql` + `@nestjs/apollo` (schema-first, resolvers built at boot per
`graphql.md`), Prisma, PostgreSQL, Jest for unit/e2e, Bun as runtime/tooling. New dependency:
`dataloader` (no `@types/dataloader` needed — it ships its own TypeScript types).

## Commands

```
Build:    bun run build
Lint:     bun run lint            (never bunx eslint directly — see docs/rules/workflow.md)
Test:     bun run test
Coverage: bun run test:cov
E2E:      bun run test:e2e        (needs a real reachable Postgres — see content-engine.e2e-spec.ts)
Dev:      bun run start:dev
Format:   bun run format          (Prettier; run on all changed .ts files before commit)
Install:  bun add dataloader
```

## Project Structure (relevant paths)

```
src/modules/media/domain/repositories/media-asset.repository.ts       → add findByDocumentIds
src/modules/media/infrastructure/persistence/prisma-media.repository.ts → implement findByDocumentIds (findMany + in:)
src/modules/graphql/application/graphql-context.factory.ts            → construct per-request DataLoader, extend GraphqlContext
src/modules/graphql/application/resolver-factory.service.ts           → collectMediaFieldResolvers + MediaFieldResolver use context.mediaAssetLoader
src/modules/graphql/graphql.module.ts                                 → move MEDIA_ASSET_REPOSITORY wiring to contextFactory
test/content-engine.e2e-spec.ts (or a new graphql e2e file)           → batched-query assertion for a media-bearing list query
docs/documents/graphql.md                                             → document DataLoader batching behavior
docs/documents/media.md                                               → note findByDocumentIds addition
```

## Code Style

Match existing style — constructor-injected dependencies, no console/logger calls in the hot path.
`DataLoader`'s batch function must preserve the DataLoader contract exactly: return an array the same
length and order as the input keys array, with `null` (not a thrown error, not `undefined`) for any key
with no matching row — a violated contract silently corrupts unrelated results. Keep
`collectMediaFieldResolvers`'s existing recursive shape (component-tree walk) intact; only the resolver
closure body and its captured dependency change.

## Testing Strategy

- **Unit tests:** extend `prisma-media.repository.spec.ts` (or add one if none exists) for
  `findByDocumentIds` — empty-array input, partial matches, no matches. Extend
  `graphql-context.factory.spec.ts` to assert a fresh `DataLoader` instance is attached per call to
  `createContext` (not a shared singleton). Extend `resolver-factory.service.spec.ts` for the new
  `context`-based resolver signature — assert the resolver calls `context.mediaAssetLoader.load(fk)`,
  not the repository directly.
- **Integration/e2e (the test that actually proves the fix):** in `content-engine.e2e-spec.ts` or a new
  GraphQL-specific e2e file, seed multiple documents that each reference a media asset, run one GraphQL
  list query selecting the `media` field for all of them through the real Apollo/Nest wiring, and assert
  — via a Prisma query-count spy/log or an equivalent observable signal — that exactly one `mediaAsset`
  query fires for the whole response, not one per document. This is the only way to actually prove
  DataLoader's per-tick batching works end-to-end through real GraphQL execution, not just that the code
  compiles.
- **Coverage:** per `docs/rules/workflow.md`, no `coverageThreshold` entries for Prisma repository files;
  add/extend one for `graphql-context.factory.ts` if it gains materially new branches.
- No manual browser verification needed (backend-only); verify via `bun run test:cov` and
  `bun run test:e2e`.

## Boundaries

- **Always:** run `bun run lint`, `bun run test:cov`, and `bun run test:e2e` before considering any task
  done; run `bun run format` on changed `.ts` files; preserve the DataLoader-per-request lifecycle (never
  share one instance across requests); preserve existing GraphQL response shapes/field names exactly.
- **Ask first:** any change to `IMediaAssetRepository`'s existing method signatures (only additive —
  `findByDocumentIds` — is in scope); any change to `graphql.module.ts` wiring beyond moving the
  `mediaAssets` dependency from resolver-factory construction to context-factory construction; committing
  without explicit user confirmation of the exact staged files + message.
- **Never:** introduce a batching mechanism for fields other than `media` in this pass (out of scope, no
  other N+1 was found); make the DataLoader instance request-unscoped/shared; change document/component
  module code (already fixed, separate spec).

## Success Criteria

- A GraphQL list (or single-item-with-repeated-component) query selecting a `media` field issues exactly
  one batched `mediaAsset` query for the whole response, proven by an e2e assertion.
- No change to GraphQL schema, field names, or response shapes.
- `docs/documents/graphql.md` and `docs/documents/media.md` reflect the new batching behavior.
- `bun run build`, `bun run lint`, `bun run test:cov`, and `bun run test:e2e` all pass.

## Open Questions

- Exact mechanism for observing/asserting "one query, not N" in the e2e test (Prisma query-event
  logging via `$on("query", ...)`, a spy on `PrismaMediaRepository.findByDocumentIds`, or similar) — size
  this in the Plan phase against whatever query-observability pattern (if any) already exists in the test
  suite.
- Whether to also add a small `findByDocumentIds` unit-level assertion of SQL shape (`IN` clause) or
  leave that to the e2e proof — Plan phase should decide based on existing repository test conventions
  (`prisma-component.repository.spec.ts` is the closest precedent from the prior batching fix).
