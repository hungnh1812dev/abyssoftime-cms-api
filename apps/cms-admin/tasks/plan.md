# Plan: Integrate `abyssoftime-cms-api` into CMS-Admin

Approved 2026-07-28. Backend runs at `http://localhost:8080`; `CORS_ORIGINS` already includes
`http://localhost:5173` (cms-admin's dev origin) per user confirmation.

## Context

`apps/cms-admin` was cloned from a sibling project built against a different, older backend
contract: Bearer-token-in-memory auth, `/api/*` paths, invite-based onboarding, a hardcoded
4-role hierarchy, and locale/i18n support. The actual backend it must run against —
`abyssoftime-cms-api` — is meaningfully different: httpOnly cookie-session auth (no token in any
response body), every path under `/api/v1/*` (including `/auth/*`, which today is called
unprefixed) except unprefixed `/health`, self-register+OTP-verify onboarding (no invites), a
fully dynamic DB-driven role/permission catalog, and no locale support at all. This plan rewires
every affected module to the real contract per `specs/cms-api-integration.md` (the approved
spec), hides locale UI without deleting its source, and removes invite UI entirely (the one
explicit exception to "keep source," per prior user decision).

Research during planning (three parallel `Explore` agents reading every touched file in full)
surfaced additional scope beyond the spec's original path-and-shape framing: `types/cms.ts`'s
`ContentType`/`ContentTypeSummary`/`FieldDefinition`/`MediaAsset`/`Document` types use a
PascalCase/legacy shape (`Fields`, `CreatedAt`, `ID`, `fileExt`, flat `updatedByName` string) that
doesn't match the new API's camelCase `ContentTypeResponseDto`/`FieldDefinitionResponseDto`/
`MediaAssetResponseDto`/`DocumentResponseDto` at all — this needs a full type rewrite, not just a
path swap, and it cascades into `ContentTypePanel`, `CollectionListPage`, `useContentTypes`,
`useMedia`, and the content-type registry. This is Phase 5, the largest phase.

## Architecture Decisions

- **Shared `PermissionTree` extraction**: `RolesPage.tsx`'s inline `PermissionTree` (lines 44–100)
  is already a pure, generic `{permissions: PermissionItem[], selected: string[], onChange}`
  component with no Roles-specific coupling. `AccessTokensPage` needs the identical tri-state
  grouped-by-resource picker once it switches to the shared permission catalog.

  | Option | Fit | Complexity | Maintenance | Precedent |
  |---|---|---|---|---|
  | Extract to `src/components/permissions/PermissionTree.tsx`, both pages import it (chosen) | High — literal same data model in both consumers | Low — export + move, no prop changes needed | One implementation instead of two diverging ones | Matches this repo's existing pattern of shared components in `components/` |
  | Duplicate the tree into `AccessTokensPage` | Low — two copies of tri-state logic to keep in sync | Low now, rises over time | Bugs/UX fixes need to land twice | None in this repo |
  | Keep hand-built picker, repoint scope strings at permission slugs | Poor — contradicts the approved spec decision | Lowest short-term | Leaves two permission vocabularies (already a flagged problem) | Explicitly rejected by the spec |

  `groupByResource`/`resourceOf` move with it; `PermissionSubTree` (RolesPage's read-only
  table-preview variant) stays local to `RolesPage.tsx`.

- **`ProtectedRoute` role gating**: replace `minRole: "admin" | "super_admin"` (string) with
  `minLevel: number`, compared against the caller's live `role.level` from `GET /auth/me`.
  `router.tsx` gets named constants (`ROLE_LEVEL.ADMIN = 50`, `ROLE_LEVEL.SUPER_ADMIN = 100`)
  rather than bare numeric literals at each route.

- **Dead code hit by the auth rewrite**: `src/components/AdminRoute.tsx` (already documented as
  dead — not imported by `router.tsx`) does `role !== "admin"` where `role` is currently a
  string. Once `AuthContext`'s `role` becomes `RoleItem | null` (an object, to carry
  `.level`/`.permissions` live), this stops type-checking. Since the file is unreferenced dead
  code with only a dedicated test (`RouteGuards.test.tsx`, which tests `AdminRoute` and
  `ProtectedRoute` together), delete `AdminRoute.tsx` and split its test file to keep only the
  `ProtectedRoute` coverage.

- **No self-service profile-edit UI exists today** (confirmed via full-file read of
  `UsersPage.tsx`/`useUsers.ts` — no `PUT /users/:id` hook or form anywhere). Resolution: build
  nothing new here this pass — the simplest route that still avoids shipping a
  plaintext-password path.

## Task List

### Phase 0 — Environment & Live Smoke Test (no source changes)

- [ ] Task 0.1: Confirm backend reachability, seed the first super_admin user via the real
      register→verify(real email)→login flow; confirm `GET /auth/me` shows `role.level === 100`.

### Phase 1 — Auth & Session Rewrite (cookie-session model)

- [ ] Task 1.1: Rewrite `lib/api.ts` for cookie-session auth (drop Bearer/token machinery; 401
      handler calls `POST /api/v1/auth/refresh` with no body).
- [ ] Task 1.2: Rewrite `AuthContext` around `GET /api/v1/auth/me` (drop `decodeToken`; `login()`
      takes no token arg).
- [ ] Task 1.3: `ProtectedRoute` → `minLevel`; delete dead `AdminRoute.tsx`; split
      `RouteGuards.test.tsx`.
- [ ] Task 1.4: `LoginPage` → `/api/v1/auth/login` + `/api/v1/auth/has-users`; `router.tsx` gets
      `ROLE_LEVEL` constants, every route's `minRole` → `minLevel`.

**Checkpoint 1:** `bun run test -- lib/api AuthContext RouteGuards LoginPage` pass. Live: log in
via the actual UI against `localhost:8080`, confirm no `Authorization` header on any request.
Commit checkpoint.

- [ ] Task 1.5: `RegisterPage` (+ `username`/`accountType` fields) + new `VerifyOtpPage`
      (verify-otp + resend-otp).
- [ ] Task 1.6: New `ForgotPasswordPage` + `ResetPasswordPage`; `LoginPage` gets a "Forgot
      password?" link.
- [ ] Task 1.7: Remove invite flow entirely — delete `useInvites.ts` + `InviteAcceptPage.tsx`,
      remove `/invite/:token` route, strip the invite dialog/table block from `UsersPage.tsx`.

**Checkpoint 2 (end of Phase 1):** `bun run test`, `bun run lint`, `bun run build` clean. Live:
has-users → register (real email) → verify-otp → login → forgot/reset password; `/invite/anything`
unreachable. Commit checkpoint.

### Phase 2 — Dynamic Roles, Permissions & Users

- [ ] Task 2.1: Delete `lib/roles.ts`; rewrite `useRoles.ts`/`usePermissions.ts` paths to
      `/api/v1/roles`, `/api/v1/permissions`.
- [ ] Task 2.2: Rewrite `useUsers.ts` — unpaginated `GET /users`; `useUpdateUserRole` becomes
      `PATCH /users/:id/role` with `{ roleId }`.
- [ ] Task 2.3: `UsersPage` — dynamic role hierarchy off live `level` data, drop
      `ALL_ROLES`/`roleLevel`; role-change `<Select>` keyed by `roleId`.
- [ ] Task 2.4: `RolesPage`/`PermissionsPage` path updates; extract `PermissionTree` to
      `src/components/permissions/PermissionTree.tsx`.

**Checkpoint 3 (end of Phase 2):** `bun run test`, `bun run lint`, `bun run build` clean. Live:
users list, role change, role/permission CRUD via the extracted picker. Commit checkpoint.

### Phase 3 — Access Tokens Rebuild

- [ ] Task 3.1: Rewrite `useAccessTokens.ts` — unpaginated list, new field shapes, `expiresIn`
      enum, new `useRevokeAccessToken` hook.
- [ ] Task 3.2: Rebuild `AccessTokensPage` scope picker on the shared `PermissionTree` +
      `usePermissions()`; wire revoke; reuse the "show plaintext token once" modal for both
      create and revoke.

**Checkpoint 4 (end of Phase 3):** `bun run test`, `bun run lint`, `bun run build` clean. Live:
create token with scoped permissions, revoke, delete. Commit checkpoint.

### Phase 4 — Hide Locale Route & Nav

- [ ] Task 4.1: Remove `/admin/settings/internationalize` route + its lazy import from
      `router.tsx`; remove the `locales:manager` `SidebarItem` from `Sidebar.tsx`. Leave
      `InternationalizePage.tsx`/`LocaleSelector.tsx`/`useLocales*.ts` untouched and confirm they
      still typecheck (`bun run build`) while unreferenced.

### Phase 5 — Content Types, Documents & Media Contract Rewrite (largest phase)

- [ ] Task 5.1: Rewrite `src/types/cms.ts` to the new camelCase shapes
      (`ContentTypeSummary`/`ContentType`/`FieldDefinition`/`Document`/`SYSTEM_FIELDS`/
      `MediaAsset`); keep `Locale` type as-is (still used by the orphaned Phase-4 files).
      Verify via `bun run build` before touching any consumer.
- [ ] Task 5.2: Rewrite `useContentTypes.ts` paths → `/api/v1/content-types[/:slug][/list-fields]`;
      fix the pre-existing `DocumentID` test-fixture mismatch while here.
- [ ] Task 5.3: Rewrite `useCollectionDocuments.ts` + `useSingleTypeDocuments.ts` — paths →
      `/api/v1/documents/collection-type|single-type/...`; drop `locale` from every signature and
      query key; `updatedBy` → `{documentId, name}|null`; reconcile bulk-delete's
      `{deleted, failed}` partial-success shape.
- [ ] Task 5.4: Strip locale from `ContentTypePanel.tsx` (selector, state, discard-dialog, query
      params); audit `MediaInput` for a `field.ext` dependency now that `FieldDefinition` drops it.
- [ ] Task 5.5: Strip locale from `CollectionListPage.tsx`; audit pagination/filter query params
      field-by-field against `docs/api-reference.md`'s table.
- [ ] Task 5.6: Rewrite `useMedia.ts` + `MediaLibrary`/`MediaLibraryPage` — unpaginated list, new
      field shapes (`mimeType`/`size`/`uploadedBy`, no `ID`/`fileExt`).
- [ ] Task 5.7: Confirm `content-type-registry` and `Sidebar`'s content-type nav still
      compile/work against the new `useContentTypes()` shape.

**Checkpoint 5 (end of Phase 5):** `bun run test`, `bun run lint`, `bun run build` clean. Live:
full content path — list/search/filter, open/edit/save/publish/unpublish/duplicate/bulk-delete a
document, single-type edit, media upload/view/delete; confirm no `locale` param on any request.
Commit checkpoint.

### Phase 6 — Full Regression, Docs Update, Review, Clean-up

- [ ] Task 6.1: Full automated regression — `bun run lint`, `bun run test`, `bun run build`, zero
      warnings introduced.
- [ ] Task 6.2: Full live walkthrough of every flow touched in Phases 1–5 in one continuous
      session against `localhost:8080`.
- [ ] Task 6.3: Update `docs/documents/*.md` (`app-shell.md`, `auth.md`, `access-control.md`,
      `documents.md`, `content-type.md`, `media.md`, `locales-and-invites.md`) to reflect the new
      contract.
- [ ] Task 6.4: Update root `SPEC.md` (stale locale/backend-contract references).
- [ ] Task 6.5: Five-axis code review (correctness, readability, architecture, security,
      performance).
- [ ] Task 6.6: Clean-up — delete `specs/cms-api-integration.md` and `tasks/plan.md`/
      `tasks/todo.md`, only after Task 6.5 passes.

## Risks and Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| CORS misconfiguration | High | Resolved before Build start — `CORS_ORIGINS=http://localhost:5173` already set per user |
| `types/cms.ts` rewrite (Task 5.1) has the widest blast radius of any single change | High | Sequenced first within Phase 5, verified by `bun run build` before touching any consumer |
| `AccessTokensPage.test.tsx` tightly coupled to the hardcoded scope vocabulary being removed | Medium | Called out in Task 3.2 as a near-total rewrite, not an incremental edit |
| Live OTP-dependent flows depend on real email delivery during Build | Medium | Real email delivery confirmed configured; treat a non-arriving OTP as a live-environment blocker to raise immediately |
| Orphaned locale files could silently bit-rot into a build break | Low–Medium | Tasks 4.1 and 5.1 both include an explicit `bun run build` check with orphaned files still present |

## Verification Summary

Every phase ends in a Checkpoint requiring `bun run lint` + `bun run test` + `bun run build`
clean, plus a live manual walkthrough against the real `localhost:8080` backend. Final sign-off
is Phase 6's full regression + five-axis review + doc/spec updates + clean-up, per
`docs/rules/workflow.md`.
