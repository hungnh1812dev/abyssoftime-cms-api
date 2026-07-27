# Plan: Users module — lock down create/update, add role-assignment endpoint

See `SPEC.md` for the active spec — binding source of truth for scope/boundaries below.

## Context

`SPEC.md`'s four confirmed decisions tighten the admin-facing `users` module: `email`/`username`
become permanently immutable; `accountType`/`verified`/`roleId` stop being client-settable on both
create and update (they're internal/fixed — `verified` only ever flips via the existing self-serve
OTP-verify flow, `roleId` moves to a brand-new dedicated endpoint); and `PUT /api/users/:id` becomes
callable by the record owner as well as anyone holding `user:manager`, not admin-only. This closes
the gap where the DTO shape let a caller with `user:manager` silently rewrite login identifiers and
set arbitrary internal state at creation time, and gives role reassignment its own narrowly-scoped
permission (`user:role_manager`) instead of bundling it into general profile updates.

Confirmed via direct reads of `user.controller.ts`, `update-user.service.ts`, `permissions.guard.ts`,
`jwt-payload.ts`, plus a design review — no remaining unknowns.

## Confirmed decisions (from Spec phase, restated)

1. `POST /api/users` stays; DTO drops `accountType`/`verified`/`roleId`. Service always writes fixed
   values `accountType: false`, `verified: false`, `roleId: null`. New account becomes usable via the
   existing `resend-otp` → `verify-otp` flow (unchanged).
2. `email`/`username` permanently immutable — dropped from update entirely, uniqueness-on-update
   checks removed.
3. `PUT /api/users/:id` DTO shrinks to `name`/`password` only. Callable by the caller on their own
   record OR anyone holding `user:manager` on someone else's. Level-hierarchy/super-admin-promotion
   checks removed (existed only to gate `roleId`, which moves to decision 4).
4. New `PATCH /api/users/:id/role` endpoint, `{ roleId }`, gated by new permission `user:role_manager`
   (seeded to `super_admin` only, same pattern as every other `*:manager` slug).

## Approach

**Guard/authorization design for `PUT /:id`:** `PermissionsGuard` is a documented no-op when a route
has no `@RequirePermissions` metadata (`permissions.guard.ts:14` — `if (!required || required.length
=== 0) return true`), so the route drops `PermissionsGuard` entirely (keeps `JwtAuthGuard` only)
rather than leave a silently-inert guard, and authorization moves fully into
`UpdateUserService.execute`: after the existing 404 lookup, `if (documentId !== caller.sub &&
!caller.permissions.includes("user:manager")) throw new ForbiddenException(...)`. Mirrors existing
precedent — the service layer, not the guard, already owns the level-hierarchy business rule here.

**Role-assignment endpoint:** new `UpdateUserRoleService` gets its own `USER_REPOSITORY` +
`ROLE_REPOSITORY` and *ports* (not deletes) the existing level-hierarchy + new-role-check +
super-admin-promotion-carve-out logic being removed from `UpdateUserService` — same checks,
relocated, plus a new 404 when the target `roleId` doesn't resolve (closes a documented gap in
`docs/documents/users.md`'s Known Gaps: no existence check exists today). Kept as defense-in-depth
even though `user:role_manager` is `super_admin`-only for now, since the point of a dedicated
permission slug is that it's independently grantable later.

**Repository/DI layer needs no changes** — `IUserRepository.update`/`UpdateUserData` already accepts
a `roleId`-only partial update; `RoleModule` is already imported into `user.module.ts` (its consumer
just changes from `UpdateUserService` to the new `UpdateUserRoleService`).

Build order: Phase 1 (create) → Phase 2 (update) → Phase 3 (new role endpoint) → Phase 4 (manual
verify, docs, spec cleanup). Each phase verified (`bun run build`/`test`/`lint`) before its checkpoint
commit — see `tasks/todo.md`.
