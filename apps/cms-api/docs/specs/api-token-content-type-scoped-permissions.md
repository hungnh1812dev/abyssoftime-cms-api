# Spec: Content-Type-Scoped Document Permissions for API Tokens

## Objective

Today an API access token's `permissions: string[]` grants a document action
(`document:read`/`create`/`update`/`delete`/`publish`/`unpublish`) across
**every** content type — there is no way to issue a token that can, say, only
`read` the `cv-page` content type. This feature lets a token be scoped to one
or more specific content types per action, while still allowing "all content
types" as an explicit choice (today's behavior, kept as the default/global
option).

**User:** an admin creating an API token in `cms-admin`, for a downstream
integration that should only touch specific content types (e.g. a public
website build script that should only ever read `cv-page`, never touch
`header` or `en-it-vocab`).

**Success looks like:** a token created with `document:read:cv-page` can read
`cv-page` documents and is rejected (403) on every other content type, via
both REST and GraphQL. A token created with the existing global
`document:read` keeps working exactly as it does today, on every content
type — zero regression for existing tokens.

## Decisions locked in during spec (see conversation for full comparison tables)

1. **Slug convention, not a structured field.** `AccessToken.permissions`
   stays `string[]`. A new optional third segment scopes a document
   permission to one content type: `document:<action>:<content-type-slug>`
   (e.g. `document:read:cv-page`), sibling to the existing 2-segment global
   slug `document:<action>` (= all content types). No `AccessTokenEntity`/DTO
   schema change. This follows the repo's existing "expand permission groups,
   don't build a hierarchy" precedent (`managerEquivalentOf` in
   `permissions.guard.ts`).
2. **Scoping applies to document actions only.** `media:*`,
   `permission:*`, `role:*`, `user:*`, `content_type:*`, `api_token:*` are
   untouched — still global-only.
3. **Scoping applies to API tokens only, not human roles.** `PermissionsGuard`
   (JWT/cookie session path used by human users via `Role.permissions`) is
   **not** touched — roles keep today's global-only behavior. The new
   3-segment slugs are only ever meaningful to the API-token auth path.
4. **Both REST and GraphQL must enforce this — which means wiring
   `ApiTokenGuard` onto REST document routes for the first time.**
   Discovered during research: `ApiTokenGuard` (`src/common/guards/api-token.guard.ts`)
   is currently dead code in production routing — REST document routes
   (`CollectionTypeDocumentController`/`SingleTypeDocumentController`) only
   accept the human JWT session cookie today; only GraphQL
   (`GraphqlContextFactory`) accepts `Authorization: Bearer <api-token>`, via
   its own inline bearer-token lookup that duplicates (not reuses)
   `ApiTokenGuard`'s logic. This spec activates `ApiTokenGuard` on the REST
   document surface as part of delivering scoped enforcement there — a larger
   change than "just add scoping," confirmed with the user as in-scope.
5. **cms-admin's token-creation UI (`PermissionTree`) is in scope.**

## Tech Stack

No new dependencies. Backend: existing NestJS + Prisma/Postgres +
Jest stack (`apps/cms-api`). Frontend: existing cms-admin React + TS stack
(`apps/cms-admin`), reusing the existing `useContentTypes()` hook and
`PermissionTree` component.

## Commands

Backend (`apps/cms-api`):
```
Build:  bun run build
Test:   bun run test:cov
E2E:    bun run test:e2e
Lint:   bun run lint
```
Frontend (`apps/cms-admin`): use that app's existing equivalent scripts
(typecheck/test/lint) — not re-specified here; follow that app's own
`CLAUDE.md`/conventions when the frontend tasks are implemented.

## Design

### 1. Permission catalog sync (new)

New service `DocumentPermissionSyncService` (new file inside the
`content-type` module, e.g.
`src/modules/content-type/application/services/document-permission-sync.service.ts`).
`ContentTypeModule` gains an import of `PermissionModule` (new edge in the
module graph — content-type does not currently depend on permissions).

- Called explicitly as the **last step** of `ContentTypeSyncService`'s
  existing `onApplicationBootstrap()` method (same hook, sequential call —
  not a second independent `OnApplicationBootstrap` provider), to avoid the
  cross-module bootstrap-ordering race the research flagged between
  `seed-default-data.service.ts` and content-type sync.
- For every loaded content-type definition × the 6 document actions,
  idempotently ensure a `Permission` row exists with slug
  `document:<action>:<content-type-slug>` — same "skip if already present"
  pattern as `seed-default-data.service.ts`'s `DEFAULT_PERMISSIONS` seeding.
  Bypasses the public `CreatePermissionDto`/its 2-segment slug regex (calls
  the repository directly) since these rows are system-managed, not
  admin-authored — the public `POST /permissions` regex is **not** changed.
- **No deletion** of scoped-permission rows when a content type is removed
  from `content-types/*.json` — matches the existing "diff-based, never
  destructive" philosophy of `ContentTypeSyncService`. An orphaned slug
  becomes permanently inert (nothing can match it once the route/resolver for
  that content type is gone) but is left in the catalog, same as this repo's
  existing tolerance for unused/orphaned state elsewhere.

### 2. Shared "is granted" logic (new, reused by both REST and GraphQL)

New pure function, e.g.
`isDocumentActionGranted(granted: string[], action: string, contentTypeSlug: string): boolean`
in `src/common/authorization/document-permission.util.ts`:

```ts
export function isDocumentActionGranted(
  granted: string[],
  action: DocumentAction,
  contentTypeSlug: string,
): boolean {
  return (
    granted.includes(`document:${action}`) ||
    granted.includes(`document:${action}:${contentTypeSlug}`)
  );
}
```

Global slug always wins first (cheap check, matches "all content types"
mental model). Both enforcement paths below call this same function — no
duplicated string-building.

### 3. GraphQL enforcement (existing path, extended)

`assertApiTokenPermission` (`src/modules/graphql/**/authorize.util.ts`)
signature changes from `(context, permissionSlug)` to
`(context, action, contentTypeSlug)`, internally delegating to
`isDocumentActionGranted`. All call sites in
`resolver-factory.service.ts` (already have `definition.slug` in closure
scope at every call site — confirmed during research) pass it through.

### 4. REST enforcement (new — activates `ApiTokenGuard`)

Two new guards, scoped to the document module only (does **not** touch the
shared `PermissionsGuard`/`JwtAuthGuard` used by every other module — per
this repo's module-independence rule):

- `DocumentAuthGuard` — if `Authorization: Bearer <token>` header is present,
  delegates to `ApiTokenGuard`'s existing verification and sets
  `request.apiToken`; otherwise falls back to the existing `JwtAuthGuard`
  cookie-session check and sets `request.user`. 401 if neither succeeds.
- `DocumentPermissionsGuard` — if `request.apiToken` is set, calls
  `isDocumentActionGranted(request.apiToken.permissions, action, request.params.slug)`;
  if `request.user` is set, delegates to the existing global-only
  `PermissionsGuard` logic unchanged (human roles are unaffected by this
  feature, per decision #3 above).

Both replace `JwtAuthGuard`/`PermissionsGuard` **only** on
`CollectionTypeDocumentController` and `SingleTypeDocumentController` routes.
`PublicDocumentController` (already unauthenticated) is untouched.

### 5. Backward compatibility / migration

No `AccessToken`/`Permission` schema migration. Existing tokens holding only
2-segment global slugs (`document:read`) keep working identically — the
global check is the first branch of `isDocumentActionGranted`. No data
backfill needed.

### 6. Frontend (`apps/cms-admin`)

- `PermissionTree.tsx`'s `"document"` resource group gets a new rendering
  branch (the other 5 resource groups — `media`, `permission`, `role`,
  `user`, `content_type`, `api_token` — keep today's flat leaf-checkbox
  list). For each of the 6 document actions, render:
  - A toggle: **"All content types"** (default — selects the global
    `document:<action>` slug) vs **"Specific content types"** (selects zero
    or more `document:<action>:<content-type-slug>` entries via checkboxes
    populated from the existing `useContentTypes()` hook).
  - Switching the toggle clears whichever slug set was previously selected
    for that action, to avoid redundant/conflicting combinations (e.g. both
    `document:read` and `document:read:cv-page` selected at once).
- New helper `parseDocumentPermissionSlug(slug): { action, contentTypeSlug？}`
  (name pending — implement alongside `permissionGrouping.ts`) to detect and
  split a 3-segment `document:*` slug when re-hydrating a picker's state (not
  needed today since there's no edit flow, but keeps the parser symmetric
  with the builder for whenever an edit flow is added).
- No `AccessTokenItem`/`PermissionItem` type changes — `permissions` stays
  `string[]` on the frontend too.
- Only a **create** flow exists for tokens today (`AccessTokensPage.tsx`) —
  no edit form exists, so this feature only touches the create dialog.

## Project Structure (files touched)

Backend (`apps/cms-api`):
```
src/modules/content-type/application/services/document-permission-sync.service.ts   (new)
src/modules/content-type/application/services/content-type-sync.service.ts          (calls new service at end of bootstrap)
src/modules/content-type/content-type.module.ts                                     (import PermissionModule)
src/common/authorization/document-permission.util.ts                                (new — isDocumentActionGranted)
src/modules/graphql/**/authorize.util.ts                                            (assertApiTokenPermission signature change)
src/modules/graphql/application/resolver-factory.service.ts                         (pass definition.slug at each call site)
src/common/guards/document-auth.guard.ts                                            (new)
src/common/guards/document-permissions.guard.ts                                     (new)
src/modules/document/presentation/collection-type-document.controller.ts            (swap guards)
src/modules/document/presentation/single-type-document.controller.ts                (swap guards)
```

Frontend (`apps/cms-admin`):
```
src/components/permissions/PermissionTree.tsx      (new document-group rendering branch)
src/components/permissions/permissionGrouping.ts    (new parse/build helpers for 3-segment slugs)
```

## Code Style

Match existing patterns exactly — e.g. `isDocumentActionGranted` mirrors the
plain-function style of `assertPermissionsExist` (`assert-permissions-exist.util.ts`);
`DocumentPermissionSyncService`'s idempotent upsert loop mirrors
`seed-default-data.service.ts`'s `findBySlug`-guard pattern.

## Testing Strategy

Backend (Jest, unit + one e2e pass), per this repo's existing conventions:
- `isDocumentActionGranted`: global match, scoped match, no match, both
  present.
- `DocumentPermissionSyncService`: new content type → 6 new rows; re-run →
  zero new rows (idempotency); removed content type → no deletion.
- `resolver-factory.service.spec.ts`: updated `assertApiTokenPermission`
  call-site assertions (action + contentTypeSlug passed correctly).
- `document-auth.guard.spec.ts` / `document-permissions.guard.spec.ts`: bearer
  path, cookie path, neither (401), scoped-grant/deny, global-grant paths.
- `test/graphql.e2e-spec.ts` and a REST document e2e spec: a token scoped to
  `document:read:cv-page` succeeds on `cv-page`, 403s on a different content
  type; a token with global `document:read` succeeds on all.
- Per project rule: no `coverageThreshold` entries for the Prisma
  repository/controller files.

Frontend: component test for `PermissionTree`'s new per-action toggle
(global vs specific selection, correct slug array produced), following
whatever test setup/mocking convention `apps/cms-admin` already uses for
`useContentTypes`.

## Boundaries

- **Always:** run `bun run build && bun run lint && bun run test:cov`
  (and `test:e2e` at checkpoints) after each backend task; keep existing
  global-slug tokens behaviorally unchanged; keep permission-catalog sync
  additive-only (never auto-delete rows).
- **Ask first:** any change to the shared `PermissionsGuard` used by
  non-document modules; any change to `DEFAULT_ROLES`/`DEFAULT_PERMISSIONS`
  seed data; any change to the public `POST /permissions` slug-format regex.
- **Never:** regress existing tokens/routes that use only global slugs; add
  content-type scoping to non-document resources in this cycle; auto-delete
  `Permission` rows when a content type is removed.

## Success Criteria

- [ ] Token with `["document:read:cv-page"]` reads `cv-page` via REST and
      GraphQL; gets 403 on every other content type, via both surfaces.
- [ ] Token with `["document:read"]` (global, unchanged) still reads every
      content type via both surfaces — no regression.
- [ ] Boot-time sync creates exactly 6 new `Permission` rows per content
      type; a second boot creates zero new rows.
- [ ] `PermissionTree` renders a working "All content types" vs "Specific
      content types" picker for each of the 6 document actions and produces
      the correct slug array on token creation.
- [ ] `bun run build && bun run lint && bun run test:cov && bun run test:e2e`
      all green in `apps/cms-api`; `apps/cms-admin`'s equivalent checks green.

## Open Questions

1. `DEFAULT_ROLES` (`super_admin`/`admin`) — leave untouched (recommended,
   since roles don't consume scoped slugs), confirm before implementation.
2. Confirm content-type slug charset (expected lowercase-kebab, e.g.
   `cv-page`) is safe to embed directly as the 3rd slug segment with no
   extra encoding — verify against `SchemaLoaderService`'s slug validation
   during the Plan phase.
3. Cross-repo commit sequencing: backend lands first (frontend's picker is
   inert without the new catalog rows/enforcement) — confirm this ordering
   before starting `/build`.
