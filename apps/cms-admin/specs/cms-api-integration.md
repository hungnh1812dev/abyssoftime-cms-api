# Spec: Integrate `abyssoftime-cms-api` into CMS-Admin

Working feature spec (deleted per `docs/rules/workflow.md`'s Clean-up step once this ships and
`docs/documents/*` + root `SPEC.md` reflect the final state). Source of truth for the API being
integrated: `docs/cms-admin-integration.md` (prose/gotchas) and `docs/api-reference.md` (flat
endpoint table).

## 1. Objective

This frontend (`apps/cms-admin`) was cloned from a sibling project and built against a
**different, older backend contract** — Bearer-token auth with an in-memory access token,
`/api/*` paths, invite-based user onboarding, a hardcoded 4-role hierarchy, and locale/i18n
support. The actual backend it must run against, `abyssoftime-cms-api`, is meaningfully
different: httpOnly-cookie session auth, `/api/v1/*` paths, self-register + OTP-verify
onboarding, a fully dynamic DB-driven role/permission system, no invites, and no locale/i18n
support at all.

Goal: rewire every module in this app to the real API contract so the admin UI actually works
against `abyssoftime-cms-api`, while:
- **Locales** — disabled (hidden from routes/nav, not deleted) since the backend has no
  locale support. Source files stay in the repo, unreferenced, for possible future reactivation
  if a locale-capable backend shows up.
- **Invites** — removed entirely (source deleted, not hidden) since the backend has no
  invite-based signup and never will under the current self-register+OTP model. Confirmed
  explicitly with the user as an exception to the "keep source" rule that applies to locales.
- Everything else that's merely a contract change (paths, shapes, auth model, role model,
  access-token scopes) gets rewritten in place, not hidden.

## 2. Scope of change (by module)

### 2.1 Auth (`lib/api.ts`, `context/AuthContext.tsx`, `pages/auth/*`)

Full rewrite to the cookie-session model, not a shim:

- `lib/api.ts`: drop the `Authorization: Bearer` request interceptor, `setAccessToken`/
  `getAccessToken`, and the in-memory token entirely. `withCredentials: true` stays. The 401
  response interceptor still does one dedup'd `POST /api/v1/auth/refresh` + retry, but the
  refresh call takes no body and returns no token to store — cookies rotate server-side.
- `AuthContext`: no more `decodeToken`/JWT-payload reading. Identity, role, and permissions all
  come from one `GET /api/v1/auth/me` call (§2.3 of the integration guide) — call it on mount
  and after login. `login()` no longer takes an `accessToken` param (there isn't one); it just
  triggers a re-fetch of `/auth/me` after a successful `POST /auth/login`.
- `ProtectedRoute`: replace the `GET /auth/setup` first-run check with `GET /auth/has-users`
  (`{ hasUsers: boolean }`) — same purpose (login vs. register redirect), new endpoint/shape.
- `LoginPage`: same shape (email/password), points at `/api/v1/auth/login`; on success, no
  token to hand to `AuthContext.login()` — just call it and navigate to `/admin`. Backend
  `401` message is intentionally identical for "no such user" vs. "wrong password" — don't try
  to distinguish. `403` means "not yet verified" — surface a distinct message pointing at OTP
  verification, not a generic login failure.
- `RegisterPage`: `POST /api/v1/auth/register` (new fields: `username`, `accountType` in
  addition to `email`/`name`/`password` — see `RegisterDto` in the integration guide). On
  `201`, navigate to a new **`VerifyOtpPage`** (carry `email` via router state), not straight to
  `/login` — the new backend won't allow login until OTP-verified.
- **New `VerifyOtpPage`** (`/verify-otp`, public route): 6-digit OTP form wired to
  `POST /api/v1/auth/verify-otp`, plus a "resend code" action wired to
  `POST /api/v1/auth/resend-otp`. On success, navigate to `/login` with a success toast.
- **New `ForgotPasswordPage`** (`/forgot-password`, public route): email form wired to
  `POST /api/v1/auth/forgot-password`. Always show a generic "check your inbox" success state
  regardless of API response content (the endpoint always returns success — enumeration
  prevention — don't build any "email not found" branch).
- **New `ResetPasswordPage`** (`/reset-password`, public route, reads `?token=` from the query
  string): new-password form wired to `POST /api/v1/auth/reset-password`. `400` = invalid/
  expired token, 1-hour expiry — show a "request a new link" fallback.
- `LoginPage`/`ForgotPasswordPage` should cross-link to each other ("Forgot password?" /
  "Back to login").

### 2.2 Roles & permissions (`lib/roles.ts`, `pages/admin/settings/{RolesPage,UsersPage}.tsx`, `ProtectedRoute`)

Go fully dynamic, matching the integration guide's explicit "fetch `/permissions` and `/roles`
dynamically, don't hardcode" guidance:

- Delete `lib/roles.ts`'s hardcoded `roleLevel` map and `ALL_ROLES` array.
- `ProtectedRoute`'s `minRole="admin"`/`"super_admin"` string props become a numeric
  `minLevel` prop, compared against the caller's `role.level` (0–100, from `GET /auth/me`).
  Route table in `router.tsx` needs its `minRole` props converted to the equivalent numeric
  thresholds (seeded roles: `super_admin` 100, `admin` 50, `editor` 20, `guest` 0 — but any
  custom role can exist at any level, so routes should gate on a level threshold, not a slug).
- `UsersPage`'s role-change dropdown and "can I manage this row" checks: replace the hardcoded
  4-slug comparison with a live `GET /roles` list, comparing `level` fields. The server already
  enforces the same hierarchy rule server-side (`PATCH /users/:id/role` 403s on a
  hierarchy/super-admin-promotion violation) — the client check is UX-only, mirror it against
  live data instead of a stale constant.
- Self-service profile edit (`PUT /users/:id`): keep the name field wired up. **Remove the
  password field from this form** — the integration guide flags that this route stores the new
  password unhashed server-side today (documented gap); don't ship a plaintext-password path.
  Leave a code comment noting why, so it's easy to re-add once the backend fix lands.

### 2.3 Access tokens (`pages/admin/settings/AccessTokensPage.tsx`)

Rebuild the scope picker on the shared permission catalog instead of the current hand-built
`DOCUMENT_ACTIONS` + per-content-type-read vocabulary — the new API's `CreateAccessTokenDto.
permissions` **is** the same `resource:action` slug catalog as roles (`GET /api/v1/permissions`),
not a separate vocabulary. Reuse the same tri-state (checked/indeterminate/unchecked)
permission-tree interaction pattern `RolesPage`'s `PermissionTree` already has — extract it to a
shared component (`components/permission-tree/` or similar) consumed by both pages rather than
duplicating the tree logic, since the two pages now render the literal same catalog. An empty
`permissions` array is valid (skips slug validation server-side, "no scoped permissions") — keep
that as a selectable "no permissions" state, not a forced minimum-one-selection.

Also: the plaintext `token` is returned once on create **and** on revoke (secret always rotates
on revoke) — the existing "show once in a copy modal" UX pattern already matches this, just
confirm the revoke path shows the modal too, not just create.

### 2.4 Locales — hide (`router.tsx`, `Sidebar.tsx`, and every locale-consuming call site)

- Remove the `/admin/settings/internationalize` route from `router.tsx` and its nav entry from
  `Sidebar.tsx`.
- Remove the locale query param / `LocaleSelector` usage from `ContentTypePanel`,
  `CollectionListPage`, `useCollectionDocuments.ts`, `useSingleTypeDocuments.ts` — none of the
  new API's document routes accept a `locale` param (confirmed: no `locale` query param on any
  route, no locales module server-side, per §7 of the integration guide).
  `SYSTEM_FIELDS`/`stripSystemFields` in `types/cms.ts` should drop `locale` from the stripped
  field-name allowlist.
- **Do not delete** `InternationalizePage.tsx`, `LocaleSelector.tsx`, `useLocales.ts`,
  `useLocalesMutations.ts` — they simply become unreferenced/orphaned source, kept for a future
  backend that adds locale support. No lint rule should be added to flag unused-file orphans for
  these specifically (regular unused-*import* lint still applies to files that do get edited).

### 2.5 Invites — remove (not hidden)

- Delete `src/hooks/useInvites.ts` and `src/pages/auth/InviteAcceptPage.tsx`.
- Remove the `/invite/:token` route and its lazy import from `router.tsx`.
- Remove the entire invite dialog + "Pending Invites" table block from `UsersPage.tsx`
  (the `useCreateInvite`/`useInviteList`/`useRevokeInvite` imports and all `invite*`
  state/handlers in that file).

### 2.6 Endpoint paths & response shapes — every hook under `src/hooks/`

Base prefix changes from `/api/*` to `/api/v1/*` everywhere except `/health` (stays
unprefixed, already correct in `HealthContext`). Notable non-mechanical renames, not just a
prefix swap:

| Old | New |
|---|---|
| `/api/document-manager/collection-type/:slug/...` | `/api/v1/documents/collection-type/:slug/...` |
| `/api/document-manager/single-type/:slug` (if present) | `/api/v1/documents/single-type/:slug` |
| `GET /auth/setup` | `GET /auth/has-users` |
| `/auth/invite/:token` | *(removed, §2.5)* |
| `/api/locales/*` | *(orphaned, §2.4 — do not repoint)* |
| `/api/invites/*` | *(removed, §2.5)* |

`DocumentResponseDto.data.updatedBy` changes shape from whatever the old backend returned to
`{ documentId, name } | null` (never a missing key, never present at all on
`/public/documents/*`). Any place rendering "updated by" needs to read the object's `.name`,
not a flat `updatedByName` string field — check `types/cms.ts`'s `SYSTEM_FIELDS` for a stale
`updatedByName` entry while touching this.

Collection-list pagination/filtering (`GET /documents/collection-type/:slug`) query param
contract (`start`/`size`/`orderBy`/`sortDir`/`search`/`filters[field][$op]=value`) — confirm
`CollectionListPage`'s existing URL-as-source-of-truth query building matches this exactly
(operator names, boolean values as the *string* `"true"`/`"false"`) during Build; don't assume
it already lines up just because the shape looks similar.

Bulk create (`POST .../bulk`) now requires **both** `document:create` and `document:publish`
and auto-publishes every item (all-or-nothing rollback on any failure) — confirm this matches
whatever the current bulk-create UI assumes about permission gating and rollback semantics;
flag any mismatch during Build rather than silently reconciling it.

### 2.7 Permission slug catalog

The new catalog (`document:{read,create,update,delete,publish,unpublish}`,
`user:{read,manager,role_manager}`, `role:{read,manager}`, `permission:{read,manager}`,
`api_token:{read,manager}`, `media:{read,manager}`, `content_type:read`,
`content_type:manager`) replaces whatever slugs the old backend used. Since `Sidebar.tsx`,
`RolesPage`, `PermissionsPage`, and `AccessTokensPage` (post-§2.3 rebuild) all read this
dynamically via `GET /permissions` already (per the "go fully dynamic" decision), this should
require no hardcoded slug list changes anywhere in the frontend — confirm that's actually true
during Build (grep for any literal `"document:read"`-style string that isn't just a UI label).

## 3. Non-goals (explicitly out of scope this pass)

- Building any UI for locale management or locale-aware document editing (locales are hidden,
  not reactivated).
- Any backend changes — this is a frontend-only integration pass. Gaps flagged in the
  integration guide (no `GET /users/:id`, no pagination on `GET /users`/`GET /media`, unhashed
  self-service password) are worked around or hidden client-side, not fixed server-side.
- Re-adding invites in any form.

## 4. Tech Stack, Commands, Project Structure, Code Style, Testing Strategy

Unchanged from root `SPEC.md` — this is a contract-rewrite, not a stack change. See
`docs/ENTRYPOINT.md` for the doc index.

## 5. Boundaries

- **Always:** run `bun run lint` (never `bunx eslint .` directly) and `bun run test` before
  considering a task done; format changed files with `bun run format`; keep files ≤500 lines;
  verify every rewritten hook's path/shape against `docs/api-reference.md` directly rather than
  against memory of the old contract.
- **Ask first:** any behavior in `docs/cms-admin-integration.md`/`docs/api-reference.md` that
  looks ambiguous or contradicts current UI assumptions (e.g. the bulk-create permission/
  rollback semantics in §2.6); any further reduction of "keep source" scope beyond the invites
  exception already agreed; extracting the shared `PermissionTree` component in a way that
  would require editing `RolesPage`'s internals beyond the extraction itself.
- **Never:** silently repoint locale-consuming code at new endpoints (locales are hidden, not
  migrated); leave a plaintext-password path in the self-service profile form; commit without
  explicit confirmation of the staged files + message; include `Co-Authored-By` in commits.

## 6. Success Criteria

- Every API call in `src/hooks/*` targets a real `abyssoftime-cms-api` endpoint with the
  correct path, method, and body/response shape per `docs/api-reference.md`.
- Login → (register → OTP-verify → login) → `/admin` works end-to-end against a running
  `abyssoftime-cms-api` instance, using only cookies (no token in `localStorage`/memory/JS-
  readable state).
- No route in `router.tsx` references `/admin/settings/internationalize` or `/invite/:token`;
  `Sidebar.tsx` has no locale nav entry.
- `lib/roles.ts`'s hardcoded role map is gone; every role-hierarchy/permission check reads live
  data (`GET /roles`, `GET /permissions`, `GET /auth/me`).
- `AccessTokensPage` picks permissions from the same catalog `RolesPage` uses.
- `bun run lint` and `bun run test` pass; `bun run build` succeeds.
- `docs/documents/*.md` and root `SPEC.md` are updated to reflect the new contract (per
  `docs/rules/workflow.md`'s Update-spec/Update-docs steps), and this file is deleted once that
  happens (Clean-up step).

## 7. Open Questions

- Whether `ProtectedRoute`'s new `minLevel` thresholds should be literal numbers in
  `router.tsx` or named constants derived from the seeded roles' known levels
  (`super_admin`=100, `admin`=50, `editor`=20, `guest`=0) — resolve during Plan.
  Custom roles at in-between levels are still possible since the catalog is dynamic; the
  threshold is a floor, not a slug match.
- Exact shared-component boundary for the extracted `PermissionTree` (§2.3) — resolve during
  Plan, respecting the "modules stay independent" rule (this is a deliberate, narrow exception
  since both consumers render the literal same data model).
