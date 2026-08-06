# Spec: Gate mutating action buttons on granted permissions

Transient feature spec per `docs/rules/workflow.md`'s spec→build→update-docs→review→cleanup workflow. Delete this file once the Review step completes. Decision rationale (mechanism + tooltip choice): `docs/documents/permission-gating-techstack.md`.

## Background

Reported bug: a user with only `*:read` permissions (e.g. Guest, or any custom role) sees mutating action buttons — Revoke, Edit, Delete, Create, Upload, Publish, Unpublish — rendered as **active/enabled** across every settings and content page, even though the backend correctly rejects the request. The one exception is `UsersPage`, which already gates its role-change and delete controls on `user:role_manager`/`user:manager`.

Full survey (this session, read-only) of every mutating button and its current gating:

| Page | Action(s) | Current frontend check | Backend requirement |
|---|---|---|---|
| `AccessTokensPage` | Revoke, Delete | **None** | `api_token:manager` |
| `UsersPage` | Change role, Delete | Already correct (`user:role_manager`, `user:manager`) — no change needed | `user:role_manager`, `user:manager` |
| `RolesPage` | Create, Edit, Delete | **None** | `role:manager` |
| `PermissionsPage` | Create, Edit, Delete | **None** | `permission:manager` |
| `MediaLibraryPage` + embedded `MediaLibrary` picker | Upload, Delete | **None** | `media:manager` |
| `CollectionListPage` | Add new item, Delete row, Bulk delete | **None** | `document:create` / `document:delete` (content-type scoped) |
| `ContentTypePanel` (single- and collection-type) | Save (create/update), Publish, Unpublish | **None** (`canPublish`/`canUnpublish` only check `draftToPublish`/document status, not permissions) | `document:create`/`document:update`/`document:publish`/`document:unpublish` (content-type scoped) |

Document actions (`create`/`update`/`delete`/`publish`/`unpublish`) support an optional content-type-scoped slug on top of the bare one: the backend's `isDocumentActionGranted` (`apps/cms-api/src/common/authorization/document-permission.util.ts`) accepts a grant of either `document:<action>` (global) **or** `document:<action>:<content-type-slug>` (scoped) as satisfying a requirement for that content type. The existing frontend `hasPermission()` (`src/lib/permissions.ts`) has no notion of this — it only does exact match plus `:read`→`:manager` fallback — so document-action gating needs a new, separate check function, not a `hasPermission()` extension (see techstack doc, Decision 2 context).

This is a **frontend-only** fix. All backend `@RequirePermissions`/`DocumentPermissionsGuard` checks are already correct; nothing in `apps/cms-api` changes.

## Objective

Every mutating button in `apps/cms-admin` renders **disabled with an explanatory tooltip** when the current user's granted permissions don't satisfy the corresponding backend requirement, and stays enabled otherwise — so the UI never offers an action the API will reject.

## Acceptance Criteria

1. `AccessTokensPage`'s Revoke and Delete buttons are disabled (with tooltip `Requires the "api_token:manager" permission`) unless the user has `api_token:manager`.
2. `RolesPage`'s Create/Edit/Delete controls are disabled unless the user has `role:manager`.
3. `PermissionsPage`'s Create/Edit/Delete controls are disabled unless the user has `permission:manager`.
4. `MediaLibraryPage` and the embedded `MediaLibrary` picker's Upload and Delete controls are disabled unless the user has `media:manager`.
5. `CollectionListPage`'s "Add new item" and row/bulk Delete are disabled unless the user has `document:create`/`document:delete` respectively — **scoped to the current content type** (bare `document:create` OR `document:create:<slug>` satisfies it, matching backend semantics).
6. `ContentTypePanel`'s Save button is disabled unless the user has `document:create` (new record) or `document:update` (existing record), scoped to the content type; Publish/Unpublish are additionally disabled unless the user has `document:publish`/`document:unpublish` scoped to the content type — existing `draftToPublish`/status-based visibility rules are unchanged, this only adds a permission condition on top.
7. `UsersPage` is unchanged (already correct) — used as the reference pattern to match, not modified.
8. A disabled button shows a tooltip (via the new `components/ui/tooltip.tsx`) naming the missing permission slug; the tooltip does not appear on hover when the button is enabled.
9. `:manager` grants continue to satisfy the corresponding `:read` requirement everywhere `hasPermission()` is used elsewhere (unchanged, regression-checked by existing tests).

## Tech Stack / Constraints

Per `docs/documents/permission-gating-techstack.md`:
- New `usePermissionGate(required)` hook (bare permission) and a new `hasDocumentPermission(granted, action, contentTypeSlug)` function (document-scoped) in `src/lib/permissions.ts` — mirrors backend `isDocumentActionGranted`'s bare-OR-scoped semantics exactly.
- New `src/components/ui/tooltip.tsx` wrapping `@base-ui/react/tooltip`, following the existing `dialog.tsx`/`dropdown-menu.tsx` wrapper pattern (`data-slot`, `cn()`, Portal/Positioner/Popup). No new dependency — `@base-ui/react` is already installed.
- New `src/components/permissions/PermissionTooltip.tsx` (or similarly named) — thin wrapper composing the gate hook + tooltip so each call site is a one-line change (`disabled`/`title` moved out of hand-rolled JSX).
- No changes to any `apps/cms-api` file.

## Project Structure (files touched)

```
src/lib/permissions.ts                              → add usePermissionGate(), hasDocumentPermission()
src/components/ui/tooltip.tsx                        → new, Base UI Tooltip wrapper
src/components/permissions/PermissionTooltip.tsx     → new, disabled+tooltip composition
src/pages/admin/settings/AccessTokensPage.tsx        → gate Revoke/Delete
src/pages/admin/settings/RolesPage.tsx                → gate Create/Edit/Delete
src/pages/admin/settings/PermissionsPage.tsx          → gate Create/Edit/Delete
src/pages/admin/settings/MediaLibraryPage.tsx          → gate Upload/Delete
src/components/media/MediaLibrary.tsx                  → gate Upload/Delete (embedded picker)
src/pages/admin/panels/collection-type/layout/CollectionListPage.tsx → gate Add/Delete/bulk-delete, scoped
src/pages/admin/panels/content-type/ContentTypePanel.tsx → gate Save/Publish/Unpublish, scoped
```

Corresponding `__tests__` files for each touched component get new/updated cases per the Acceptance Criteria; no other files change.

## Code Style

Match existing conventions: named function component exports, `cn()` for class composition, `data-slot` attributes on new `ui/*` primitives (see `dropdown-menu.tsx` for the exact Base UI wrapper shape to copy). `usePermissionGate`/`hasDocumentPermission` follow the existing `hasPermission()` style in `lib/permissions.ts` — small pure functions, one-line JSDoc only where the *why* isn't obvious (mirroring backend semantics is the one non-obvious fact worth a comment, same as the existing `hasPermission()` comment).

## Testing Strategy

Vitest + Testing Library, matching each touched page's existing test harness. Per component: at least one case asserting the button is disabled (and carries the expected tooltip trigger) when the required permission is absent, and one asserting it's enabled/clickable when present. `CollectionListPage`/`ContentTypePanel` cases additionally cover the scoped-vs-bare grant (`document:create:blog-post` satisfying a `blog-post`-content-type check; a grant scoped to a *different* content type not satisfying it). `hasDocumentPermission()` gets direct unit tests mirroring the backend's `isDocumentActionGranted` test cases for parity.

## Boundaries

- **Always:** run `bun run lint` and `bun run test` before considering any task done; format touched files with `bun run format`.
- **Ask first:** any change to `hasPermission()`'s existing exact-match/`:read`→`:manager` behavior (out of scope, must stay backward compatible); any change to route-level (`router.tsx`) access guards — this spec is about button state within an already-reachable page, not page access.
- **Never:** commit without explicit confirmation of the exact staged files + message; touch `apps/cms-api`.

## Out of Scope

- Route-level read-access gating for content-type/collection routes and `settings/media` (`router.tsx` has no `requiredPermission` on any of these routes today, only settings/users/tokens/roles/permissions do) — a related but separate gap, not part of "buttons are active when they shouldn't be." Flagged as a follow-up, not fixed here.
- Any change to how permissions are granted/assigned (Role/Permission CRUD pages themselves) — this spec only changes what those pages' *own* buttons do based on the current user's grants.
