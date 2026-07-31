# Todo — Require `document:read` on Every GraphQL Read

See `tasks/plan.md` for full context, dependency graph, and rationale.

## Phase 1 — Require `document:read` on every read
- [x] Task 1.1 — Hoist `assertApiTokenPermission(context, "document:read")` above the draft branch in both single-item query resolvers; add it (net-new) to the collection-type list query resolver
- [ ] Task 1.2 — e2e: flip every tokenless read `gql()` call to use `readScopedApiToken`; add a missing-token-rejects negative case per read family
- [ ] **Checkpoint 1 (final):** all checks green; docs updated; `SPEC.md` trimmed to pointer — commit — feature complete
