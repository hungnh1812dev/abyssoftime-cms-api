# Plan: Require `document:read` on Every GraphQL Read

See `SPEC.md` for the full spec (objective, confirmed decisions across three clarification rounds, boundaries, success criteria).

## Context

The completed Dynamic GraphQL API feature (`docs/documents/graphql.md`) deliberately mirrored REST's public-read boundary: `Query.<slug>`/`Query.<slug>List` require no `Authorization` header at all when reading published data — only the `status: "draft"` branch and every mutation check `assertApiTokenPermission`. Per this cycle's `SPEC.md`, that boundary is now considered wrong for GraphQL specifically: every GraphQL read requires a `document:read`-scoped token, with no exception for published data. REST's public endpoints stay untouched — this is a GraphQL-only tightening. Mutations (`create`/`update`/`delete`/`publish`/`unpublish`) already enforce their correct `document:*` scope and need no code change; a Playground/`document:manager` auto-grant idea was raised and explicitly dropped from scope during clarification.

The fix is mechanical: `authorize.util.ts`'s existing `assertApiTokenPermission(context, "document:read")` — already called for the draft branch of every single-item query — gets hoisted so it runs unconditionally, and gets added (net-new) to the list-query resolver, which currently takes no `context` parameter at all.

## Dependency graph

```
Phase 1 — Require document:read on every read
  Task 1.1 (resolver hoist + unit tests)
    │
    └──▶ Task 1.2 (e2e verification)
             │
             └──▶ Checkpoint 1 (docs + SPEC trim + commit — final)
```

Single phase — the whole feature is one small, mechanical change to three call sites in one file.

---

## Phase 1 — Require `document:read` on every read

### Task 1.1 — Resolver change + unit tests

**Description:** `src/modules/graphql/application/resolver-factory.service.ts` — hoist the existing `assertApiTokenPermission(context, "document:read")` call above the `if (args.status === "draft")` branch (instead of inside it) in both single-item query resolvers (collection-type `query[queryName(definition.slug)]`, single-type `query[queryName(definition.slug)]`). Add `context: GraphqlContext` as a new third parameter to the collection-type list query resolver (`query[listQueryName(definition.slug)]`, currently `(_parent, args) =>` with no context at all) and call `assertApiTokenPermission(context, "document:read")` as its first line, before `translateListArgs`. No new files, no new permission slug, no new helper — reuses the already-imported `assertApiTokenPermission`.

**Acceptance criteria:**
- [ ] A missing token on a published-data single-item query, a list query, or a single-type query all reject with `UNAUTHENTICATED`.
- [ ] A token scoped anything other than `document:read` (e.g. `document:create`-only) rejects with `FORBIDDEN` on all three.
- [ ] A `document:read`-scoped token succeeds on all three, returning the same data as before.
- [ ] Every existing draft-read and mutation test (permission checks, error-mapping, media resolution) still passes unmodified.

**Verification:** `bunx jest src/modules/graphql/application/resolver-factory.service.spec.ts` — the three call sites' renamed/new tests pass; `bun run test:cov` for a full regression check.

**Dependencies:** None.

**Files:** `src/modules/graphql/application/resolver-factory.service.ts`, `resolver-factory.service.spec.ts`.

**Scope:** S.

---

### Task 1.2 — e2e verification

**Description:** `test/graphql.e2e-spec.ts` — every currently-tokenless `gql(...)` call that reads data (single-item query, list query, nested-component query, media-field query, the mid-lifecycle "public read after publish/unpublish" checks, the single-type query, and the introspection-gating block's smoke-test `cvPageList` call) gains `readScopedApiToken` as its token argument — same repeated pattern at every call site. Add one new negative case per read family (single-item query, list query, single-type query) asserting a missing token now rejects a previously-public published-data read with `UNAUTHENTICATED`, mirroring the existing `"rejects a status: draft query with no token, UNAUTHENTICATED"` test already in the file. The introspection query itself (`{ __schema { ... } }`) is untouched — it resolves through graphql-js's own built-in meta-field handling, never through the `Query` resolver map, so this change doesn't reach it (out of scope per `SPEC.md` decision #3).

**Acceptance criteria:**
- [ ] At least one e2e case per read family (single-item, list, single-type) proves a missing token now rejects with `UNAUTHENTICATED` on what used to be a public read.
- [ ] Every mutation/permission-denied e2e case is unchanged and still passing.
- [ ] The introspection e2e case is unmodified and still passing.

**Verification:** `bun run test:e2e -- test/graphql.e2e-spec.ts`.

**Dependencies:** Task 1.1.

**Files:** `test/graphql.e2e-spec.ts`.

**Scope:** S.

---

### Checkpoint 1 (final)

- [ ] `bun run build` / `bunx tsc --noEmit` / `bun run lint` / `bun run test:cov` / `bun run test:e2e` all green.
- [ ] `docs/documents/graphql.md` updated: the "Generated schema per content-type" section's `Query.<slug>`/`Query.<slug>List` bullets and the "Resolvers"/"Auth" sections' "no token for published reads" language replaced with "every read requires `document:read`".
- [ ] `docs/documents/graphql-techstack.md` confirmed — no new decision this cycle (reused an existing primitive), no edit expected.
- [ ] `SPEC.md` trimmed back to a one-line pointer (same precedent already used twice in this project).
- [ ] **Commit** (ask for confirmation with the exact staged file list + message first, per this repo's commit rule).
