# Plan: Content-Type-Scoped Document Permissions for API Tokens

See `docs/specs/api-token-content-type-scoped-permissions.md` for the full spec (objective,
decisions, boundaries). This plan implements it, with two corrections found during planning
(below) that the spec did not anticipate.

## Context

Today an API token's `permissions: string[]` grants a document action (`document:read`/`create`/
`update`/`delete`/`publish`/`unpublish`) across every content type. The goal is to let a token be
scoped to specific content types per action (e.g. only `read` on `cv-page`), while keeping "all
content types" as the default/global option — and to give `cms-admin`'s token (and role) creation
UI a matching picker.

## Corrections found during planning (supersede the spec's design)

1. **REST already accepts API tokens.** `JwtAuthGuard` (`src/common/guards/jwt-auth.guard.ts:9`)
   is `extends AuthGuard(["jwt", "api-token"])` — it composes the cookie-based `JwtStrategy` and a
   Bearer-header `ApiTokenStrategy` (`src/common/strategies/api-token.strategy.ts`), which already
   sets `request.user = { sub, permissions }` from the token record. `PermissionsGuard`
   (`src/common/guards/permissions.guard.ts`) already reads `request.user.permissions` uniformly
   for both auth sources. **No new auth guard is needed** — the spec's planned `DocumentAuthGuard`
   is dropped. Only one new guard (`DocumentPermissionsGuard`) is needed, to add the content-type-
   scoped slug check on top of the existing check.
2. **Scoping enforcement is source-agnostic, not API-token-only**, because `request.user.permissions`
   is identical in shape whether it came from a role (JWT cookie) or a token (Bearer). Confirmed
   with the user: the new per-content-type picker will appear on **both** `RolesPage.tsx` and
   `AccessTokensPage.tsx` in `cms-admin` (they already share the exact same `PermissionTree`
   component), and the backend check needs no role-vs-token discriminator.
3. Content-type slugs are validated by `SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/`
   (`src/modules/content-type/application/schema/sql-identifier.ts:4`) — safe to embed directly as
   a permission slug's 3rd segment, no encoding needed (resolves spec open question #2).

## Architecture Decisions

- **Slug convention** (unchanged from spec): `document:<action>` (global, existing) sits alongside
  a new `document:<action>:<content-type-slug>` (scoped). `AccessToken.permissions`/
  `Role.permissions` stay `string[]` — no schema change.
- **Shared "is granted" logic**: one new pure function
  `isDocumentActionGranted(granted: string[], requiredSlug: string, contentTypeSlug: string): boolean`
  in `src/common/authorization/document-permission.util.ts`, used by both the GraphQL
  `assertApiTokenPermission` and the new REST `DocumentPermissionsGuard` — no duplicated
  string-building.
- **Catalog sync**: new `DocumentPermissionSyncService` in the `content-type` module, called as the
  last step of `ContentTypeSyncService.sync()` (same `onApplicationBootstrap` hook — avoids the
  cross-module bootstrap ordering race that exists between two independent `OnApplicationBootstrap`
  providers). Idempotent create-if-missing, same pattern as `seed-default-data.service.ts`. Never
  deletes rows for removed content types (matches `ContentTypeSyncService`'s existing
  non-destructive philosophy).
- **REST enforcement**: new `DocumentPermissionsGuard` (sibling to, not a subclass of,
  `PermissionsGuard`) replaces `PermissionsGuard` only on
  `CollectionTypeDocumentController`/`SingleTypeDocumentController` routes. `JwtAuthGuard` stays
  as-is (already handles both auth sources). No other module's guard is touched.
- **GraphQL enforcement**: `assertApiTokenPermission(context, slug)` becomes
  `assertApiTokenPermission(context, slug, contentTypeSlug)`; every call site in
  `resolver-factory.service.ts` already has `definition.slug` in closure scope.
- **Frontend**: `PermissionTree.tsx`'s `"document"` resource group gets a new rendering branch (all
  other groups unchanged); `useContentTypes()` (already exists) supplies the content-type checkbox
  options. Applies to both `RolesPage` and `AccessTokensPage` automatically since they share the
  component — no new prop.
- **Commit sequencing**: backend (Phases 1-4) lands and is committed before frontend (Phase 5) —
  the picker is inert without the new catalog rows/enforcement.

## Risks and Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| `DocumentPermissionSyncService` runs on every boot and does a `findBySlug` per action×content-type (6×N sequential lookups) | Low — small N (5 content types today), admin-only path, same acceptable-at-this-scale tradeoff already documented for `countReferences`'s unindexed JSONB queries | Accept for now; note as a future batch-lookup optimization if content-type count grows significantly |
| Extending `PermissionTree` to both Roles and Access Tokens means a role can now be granted scoped document permissions too, which wasn't explicitly asked for | Low — purely additive capability, no existing behavior changes, confirmed with user | Already confirmed during planning |
| REST `DocumentPermissionsGuard` swap could regress existing document-route tests if any test asserts on `PermissionsGuard` specifically rather than behavior | Medium if present | Re-run the existing controller spec files, not just new ones |

## Open Questions

None remaining — spec's open questions were resolved during planning (charset confirmed safe;
`DEFAULT_ROLES` intentionally left untouched, consistent with "additive only, no forced grants").
