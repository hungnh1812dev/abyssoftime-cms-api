# Spec: Require Permission-Scoped API Tokens on Every GraphQL Operation

Follow-up to the completed Dynamic GraphQL API feature (`docs/documents/graphql.md`). That feature deliberately mirrored REST's public-read boundary: a published-data query needed no `Authorization` header at all, matching `GET /api/v1/public/documents/...`. This spec closes that gap — every GraphQL query and mutation now requires its matching `document:*`-scoped API token, with no exceptions for published-data reads. REST is explicitly untouched, and there is no Playground/introspection change in this cycle (dropped from scope during clarification).

## Objective

Every GraphQL operation requires the caller's API token to carry the specific permission slug for that operation — no operation executes on an unscoped or missing token, and (the actual behavior change) a plain published-data read is no longer public. `document:publish`/`document:unpublish` mutations already enforce this correctly today and are explicitly reconfirmed in scope, not re-implemented.

| Operation | Required permission | Status today |
|---|---|---|
| `Query.<slug>` / `Query.<slug>List` (published branch) | `document:read` | **Changes** — currently no token required at all |
| `Query.<slug>` (`status: "draft"` branch) | `document:read` | Already enforced — unchanged |
| `Mutation.create<Type>` | `document:create` | Already enforced — unchanged |
| `Mutation.update<Type>` / `Mutation.save<Type>` (single-type) | `document:update` | Already enforced — unchanged |
| `Mutation.delete<Type>` | `document:delete` | Already enforced — unchanged |
| `Mutation.publish<Type>` | `document:publish` | Already enforced — unchanged |
| `Mutation.unpublish<Type>` | `document:unpublish` | Already enforced — unchanged |

**User:** the same external/build-time API-token clients the original feature targeted — every consumer must now hold a token scoped `document:read` even to read published data, not just to see drafts or mutate.

**Success looks like:** `{ cvPage(Id: "...") { position } }` with no `Authorization` header, or a token that lacks `document:read`, returns a GraphQL `FORBIDDEN`/`UNAUTHENTICATED` error (per `assertApiTokenPermission`'s existing distinction) — never data. The identical query with a `document:read`-scoped token returns the published document exactly as before. Every mutation's existing permission requirement is unchanged and re-verified by the same test suite.

## Confirmed decisions (from this spec's clarification round)

| # | Decision | Chosen | Rationale |
|---|---|---|---|
| 1 | Permission for a plain (published-data) read | `document:read` — the same scope draft reads already require | User's explicit call, superseding an earlier draft of this spec that considered "any valid token, no specific scope." One consistent rule: every read, draft or published, needs `document:read`. |
| 2 | REST's public endpoints (`public-document.controller.ts`) | Untouched | User's explicit call — GraphQL-only change, zero edits outside `src/modules/graphql/**`. |
| 3 | Playground/introspection auto-permission (`document:manager`, `GRAPHQL_PLAYGROUND_ENABLE`) | Dropped entirely — out of scope for this cycle | User's explicit call after clarification; introspection/Playground gating stays exactly as `docs/documents/graphql.md` already documents (`NODE_ENV !== "production"`), untouched. |
| 4 | Publish/unpublish | Explicitly reconfirmed in scope, unchanged from today's behavior | User's explicit call — not a new requirement, just confirming the existing `document:publish`/`document:unpublish` checks stay exactly as they are. |

## Tech Stack

No new dependencies, no new permission slugs, no new files. This reuses `authorize.util.ts`'s existing `assertApiTokenPermission(context, slug)` — already the exact function draft reads and every mutation call today — applied to two more call sites. No architecture decision to make; this is a scope-tightening of an existing, tested primitive.

## Project Structure

Touches only existing files inside `src/modules/graphql/**` (application layer) plus the e2e spec and docs — no new module, no new exports from `content-type`/`document`/`media`, no seed-data changes.

```
src/modules/graphql/application/
  resolver-factory.service.ts       # the two single-item query resolvers (collection-type Query.<slug>,
                                     # single-type Query.<slug>) plus the collection-type list resolver
                                     # (Query.<slug>List) each gain an unconditional
                                     # assertApiTokenPermission(context, "document:read") — hoisted out of the
                                     # draft-only branch so it applies regardless of `status`
  resolver-factory.service.spec.ts  # existing "no token required" tests flip to assert UNAUTHENTICATED/FORBIDDEN;
                                     # existing draft/mutation permission tests unchanged
test/graphql.e2e-spec.ts            # existing no-token read assertions (single query, list query, media/single-type
                                     # throwaway content types) flip to expect a GraphQL error; a parallel
                                     # document:read-scoped-token case confirms data still returns unchanged
docs/documents/graphql.md            # Auth / resolver sections updated: "published reads need no token" language
                                     # replaced with "every read requires document:read"
docs/documents/graphql-techstack.md  # confirmed against shipped state; no new decision to add (see Tech Stack above)
```

## Code Style

Match the existing resolver exactly — hoist the permission check above the draft/published branch instead of only guarding the draft branch:

```ts
query[queryName(definition.slug)] = async (_parent: unknown, args: SingleQueryArgs, context: GraphqlContext) => {
  assertValidDocumentId(args.Id);
  assertApiTokenPermission(context, "document:read");

  if (args.status === "draft") {
    const result = await resolveOrNull(() => this.getDocumentForEdit.execute(definition.slug, args.Id));
    return result ? toResolverValue(result.document) : null;
  }

  const document = await resolveOrNull(() => this.getPublicDocument.execute(definition.slug, args.Id));
  return document ? toResolverValue(document) : null;
};
```

Same shape for the single-type query resolver and the collection-type list resolver (the list resolver gains the check as its first line, before `translateListArgs`).

## Testing Strategy

- **Unit** (`resolver-factory.service.spec.ts`): the collection-type single-item query, the single-type single-item query, and the list query each gain a case asserting `noToken`/wrongly-scoped tokens are rejected with the same `UNAUTHENTICATED`/`FORBIDDEN` codes `assertApiTokenPermission` already produces elsewhere, and a case confirming a `document:read`-scoped token still returns data for both the draft and published branches. Every existing mutation/draft-read/permission-denied test is unaffected — no rewrite, just re-verified green.
- **e2e** (`test/graphql.e2e-spec.ts`): every existing "no token required" assertion for `cvPage`/`cvPageList`/the throwaway media- and single-type content types is replaced with a no-token-rejected case plus a `document:read`-scoped-token-succeeds case. Existing permission-denied mutation cases (missing/wrong-scoped token per mutation) are unchanged.
- Per project rule: no `coverageThreshold` entries needed — no new Prisma/controller-shaped files.

## Boundaries

| Rule | Detail |
|---|---|
| **Always** | Every `Query`/`Mutation` field requires its matching `document:*` permission — no field executes on a missing or wrongly-scoped token |
| **Always** | Reuse `assertApiTokenPermission` as-is — no new authorization primitive |
| **Never** | Touch `public-document.controller.ts` or any other REST file |
| **Never** | Add a new permission slug, env var, or auto-permission mechanism (Playground/`document:manager` explicitly out of scope) |
| **Never** | Change `publish<Type>`/`unpublish<Type>`'s existing `document:publish`/`document:unpublish` requirement |

## Success Criteria

1. `bun run build`, `bunx tsc --noEmit`, `bun run lint`, `bun run test:cov` all green.
2. Every GraphQL query and list query rejects a missing/wrongly-scoped token exactly like draft reads and mutations already do; a `document:read`-scoped token reads published data unchanged.
3. Every mutation's existing permission requirement (`create`/`update`/`delete`/`publish`/`unpublish`) is unchanged and still passing.
4. `test/graphql.e2e-spec.ts` green against real Postgres, covering the flipped no-token/with-token read cases.
5. `docs/documents/graphql.md` reflects final shipped state; `SPEC.md` trimmed back to a one-line pointer once Review completes.
