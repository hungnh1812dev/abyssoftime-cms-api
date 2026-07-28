# Todo: Integrate `abyssoftime-cms-api` into CMS-Admin

Full detail/acceptance-criteria/verification per task lives in `tasks/plan.md`. Check off here as
each task completes.

## Phase 0 — Environment & Live Smoke Test
- [x] 0.1 Confirm backend reachability; seed first super_admin via real register→verify→login

## Phase 1 — Auth & Session Rewrite
- [x] 1.1 Rewrite `lib/api.ts` for cookie-session auth
- [x] 1.2 Rewrite `AuthContext` around `GET /auth/me`
- [x] 1.3 `ProtectedRoute` → `minLevel`; delete dead `AdminRoute.tsx`
- [x] 1.4 `LoginPage` + `router.tsx` role-level constants
- [x] **Checkpoint 1** — test/lint/build green; curl-verified against real backend (no browser tool available in this environment — see summary); commit
- [x] 1.5 `RegisterPage` (+ username/accountType) + new `VerifyOtpPage`
- [x] 1.6 New `ForgotPasswordPage` + `ResetPasswordPage`
- [x] 1.7 Remove invite flow entirely (delete files + strip UsersPage block)
- [x] **Checkpoint 2** — test/lint/build green (331 tests); curl-verified register/verify/login/forgot-password against real backend; `/invite/:token` route removed (static check, no browser tool available); commit

## Phase 2 — Dynamic Roles, Permissions & Users
- [x] 2.1 Delete `lib/roles.ts`; rewrite `useRoles.ts`/`usePermissions.ts` paths
- [x] 2.2 Rewrite `useUsers.ts` (unpaginated, `PATCH .../role` + `roleId`)
- [x] 2.3 `UsersPage` dynamic role hierarchy, drop `ALL_ROLES`/`roleLevel`
- [x] 2.4 `RolesPage`/`PermissionsPage` path updates; extract `PermissionTree`
- [x] **Checkpoint 3** — 343/343 tests, lint, build green; curl-verified `GET /users`/`GET /roles` shapes against real backend match hook types exactly; commit

## Phase 3 — Access Tokens Rebuild
- [x] 3.1 Rewrite `useAccessTokens.ts` (unpaginated, new shapes, `expiresIn`, revoke hook)
- [x] 3.2 Rebuild `AccessTokensPage` scope picker on shared `PermissionTree`
- [x] **Checkpoint 4** — 345/345 tests, lint, build green; curl-verified create/revoke (secret rotates)/delete against real backend; fixed a pre-existing Select-portal test flake surfaced under load; commit

## Phase 4 — Hide Locale Route & Nav
- [x] 4.1 Remove locale route + nav entry; confirm orphaned locale files still typecheck (345/345 tests, lint, build all green; confirmed no locale/internationalize chunk is bundled anymore)

## Phase 5 — Content Types, Documents & Media Contract Rewrite
- [ ] 5.1 Rewrite `src/types/cms.ts` to new camelCase shapes
- [ ] 5.2 Rewrite `useContentTypes.ts` paths
- [ ] 5.3 Rewrite `useCollectionDocuments.ts` + `useSingleTypeDocuments.ts` (paths, drop locale,
      `updatedBy` shape, bulk-delete reconciliation)
- [ ] 5.4 Strip locale from `ContentTypePanel.tsx`; audit `MediaInput` `field.ext` usage
- [ ] 5.5 Strip locale from `CollectionListPage.tsx`; audit pagination/filter params
- [ ] 5.6 Rewrite `useMedia.ts` + media UI (unpaginated, new shapes)
- [ ] 5.7 Confirm `content-type-registry` + Sidebar content-type nav still work
- [ ] **Checkpoint 5** — test/lint/build green; live full content-path walkthrough; commit

## Phase 6 — Full Regression, Docs Update, Review, Clean-up
- [ ] 6.1 Full automated regression (lint/test/build)
- [ ] 6.2 Full live walkthrough, all flows, one continuous session
- [ ] 6.3 Update `docs/documents/*.md`
- [ ] 6.4 Update root `SPEC.md`
- [ ] 6.5 Five-axis code review
- [ ] 6.6 Clean-up — delete `specs/cms-api-integration.md` and `tasks/plan.md`/`tasks/todo.md`
