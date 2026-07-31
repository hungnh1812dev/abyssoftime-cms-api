# GraphQL Module — Tech-Stack Decisions

Decisions confirmed with the user during the Spec phase of the Dynamic GraphQL API feature (see `SPEC.md` while active, or `docs/documents/graphql.md` once shipped).

## 1. GraphQL runtime

The source design (`docs/graphql.md`, Go-derived) builds a `graphql.Schema` object at runtime from DB-driven content-type definitions, entirely outside any framework's decorator system. `@nestjs/graphql`'s default (code-first, decorator-driven) model doesn't fit that — types would need to exist as TS classes at compile time, but this feature's whole premise is that types don't exist until the schema builder reads `content-types/*.json` at boot.

| Option | Fit for "dynamic, DB-driven schema" | Coupling to Nest's GraphQL lifecycle | Dependencies added | Precedent in this repo |
|---|---|---|---|---|
| **`@nestjs/graphql` schema-first, `forRootAsync`** (chosen) | Good — `forRootAsync`'s `useFactory` can return a hand-built `typeDefs` string + resolver map, computed however we want | Schema build must run inside the factory, which resolves during module init — earlier than `OnApplicationBootstrap` (see §2 below) | `@nestjs/graphql`, `@nestjs/apollo`, `@apollo/server`, `graphql` | None yet, but `@nestjs/*` is this repo's whole framework — most idiomatic long-term fit (plugins, Nest DI in resolvers via context, Nest exception filters) |
| Raw `graphql` + `graphql-http`, mounted as a plain route | Best structural match to the Go source (`schema_builder.go` builds a `graphql.Schema` directly, no framework involvement) | None — fully decoupled from any Nest module lifecycle, schema build can run whenever is convenient | `graphql`, `graphql-http` (lighter than Apollo) | None; would be the first non-Nest-native HTTP surface in the repo |
| `apollo-server-express` standalone middleware | Same decoupling benefit as the option above | None | `apollo-server-express`, `graphql` (a second, heavier Apollo-flavored runtime alongside `@nestjs/apollo` if ever added later) | None |

**Chosen: `@nestjs/graphql` schema-first + `forRootAsync`.** The user's explicit call, prioritizing framework consistency (Nest DI, exception filters, guards infrastructure already exists for the `Authorization: Bearer` context) over the marginally closer structural match the raw-`graphql` option offered. The real cost of this choice — schema-build timing — is addressed directly in §2.

## 2. Schema-build timing (typeDefs source)

`GraphQLModule.forRootAsync`'s `useFactory` resolves as part of Nest's module-init phase. `ContentTypeSyncService.onApplicationBootstrap()` (the hook that reconciles `content-types/*.json` into Postgres) runs *after* module init, right before `app.listen()`. On a cold boot, that means `CONTENT_TYPE_REPOSITORY.findAll()` — the DB read — would race an empty or stale table if used inside the GraphQL factory.

| Option | Correctness on cold boot | Coupling introduced | Extra work |
|---|---|---|---|
| **Read `content-types/*.json` directly via `SchemaLoaderService`** (chosen) | Always correct — same source of truth the sync engine itself reads, no ordering dependency at all | One additive export from `ContentTypeModule` (`SchemaLoaderService` becomes public); zero coupling to `ContentTypeSyncService`'s lifecycle | None beyond the export |
| Manually call `ContentTypeSyncService.sync()` inside the GraphQL factory before reading the repository | Correct, but sync now runs twice on every boot (once here, once in content-type's own bootstrap hook) — redundant DB writes, and couples `graphql` to `content-type`'s internal sync mechanics, not just its public read API | Higher — depends on `ContentTypeSyncService`'s exact method signature/DI shape staying stable |
| Move `ContentTypeSyncService`'s sync call from `OnApplicationBootstrap` to `OnModuleInit` (so it runs before `forRootAsync`'s factory) | Correct | Edits `content-type` module's own lifecycle hook — a real behavior change to an existing, already-shipped, already-tested module, for a different feature's benefit | Highest — reopens `content-type-sync.service.spec.ts` and the e2e boot-order assumptions |

**Chosen: read the JSON files directly.** Keeps the fix entirely inside new/additive surface area (`graphql` module + one export line), touching zero existing module internals — directly serves the "minimize effect on other modules" requirement this feature was scoped under.

## 3. Auth transport

| Option | Fit with this repo's existing auth model | Work required |
|---|---|---|
| **`Authorization: Bearer <token>` via `ApiTokenGuard`** (chosen) | `ApiTokenGuard` already exists, is fully built/tested (`api-token.guard.spec.ts`), and is explicitly "provided/exported by `AccessTokenModule` for a future caller" — GraphQL is that caller | `imports: [AccessTokenModule]` in the new module + a context-builder that reuses the guard's own hash-lookup logic for the GraphQL execution context (Apollo's `context` function isn't a Nest route, so the guard itself can't be `@UseGuards`'d onto it directly — its verification steps are reused, not the guard class as-is) |
| Reuse the cookie-based `JwtAuthGuard` (admin browser session) | Doesn't fit the target user (external/build-time clients, not a logged-in browser session); would also require CSRF-equivalent handling for a non-browser client | Not pursued |

**Chosen: API token.** User's explicit call — matches the target consumer (external/build clients) far better than a cookie session ever could, and activates an already-built, currently-dead code path instead of adding a new one.
