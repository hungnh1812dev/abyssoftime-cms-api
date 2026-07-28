# Plan: `GET /api/v1/auth/me`

See `SPEC.md` for the active spec pointer and `docs/documents/auth-me-techstack.md` for the decision
rationale tables. This plan implements the endpoint FE requested in `get-auth-me.md`.

## Context

The CMS-Admin frontend has no way to resolve the session cookie into "who is logged in and what can they
do" — login/refresh/logout only return `{ message }`, and cookies are `httpOnly`. The FE's current workaround
(`GET /users` + `GET /roles`, matched by email in memory) breaks on cold reload and requires permissions the
caller may not hold just to identify themselves.

Two design decisions were confirmed with the user in the spec phase:
1. **Fresh DB reads** for `role.permissions`/`level`/`slug`, not the JWT payload — the payload can't supply
   `role.documentId`/`role.name` anyway, so a DB role lookup is mandatory regardless.
2. **Deleted-user-mid-session → 401**, not 404 — matches the FE's existing "401 → redirect to /login"
   contract; this is the first route to look up the caller's own user row by `sub`.

**Correction found during planning:** `SPEC.md`'s decision #3 said `IRoleRepository.findById` *throws*
`RoleNotFoundError` for a missing role. Checked `prisma-role.repository.ts:23-26` — it does not; `findById`
returns `null` (cast through `null as unknown as RoleEntity`, an existing type-signature inaccuracy already
present in this codebase). The real precedent, from `UpdateUserRoleService`
(`update-user-role.service.ts:25-28`), is an explicit `if (!newRole) throw new NotFoundException(...)` check.
This plan follows that precedent; Task 1 fixes `SPEC.md` to match.

## Key files

- `src/modules/auth/presentation/dto/me-response.dto.ts` (new) — `MeResponseDto`, mirrors
  `UserResponseDto`'s fields + nested `role: RoleResponseDto | null`
- `src/modules/auth/application/services/get-me.service.ts` (new) — `GetMeService`, injects
  `USER_REPOSITORY`/`ROLE_REPOSITORY` (both already exported since `AuthModule` imports `UserModule` +
  `RoleModule`)
- `src/modules/auth/presentation/auth.controller.ts` — add `GET auth/me`, `JwtAuthGuard` only (no
  `PermissionsGuard`), `@ApiCookieAuth()` on this method only (every other route here is public by design)
- `src/modules/auth/auth.module.ts` — register `GetMeService` as a provider
- `docs/documents/auth.md`, `docs/cms-admin-integration.md` — document the shipped endpoint, remove the
  "no GET /auth/me" known gap

## Confirmed decisions (from the Spec + Plan phases, restated)

1. Role/permissions returned fresh from `RoleRepository`, not `req.user`'s JWT payload.
2. `findById(sub)` returning no user → `401 UnauthorizedException` ("Invalid session").
3. `user.roleId === null` → `role: null`, no role lookup performed.
4. `roles.findById(user.roleId)` returning `null` (orphaned `roleId`) → `404 NotFoundException`, matching
   `UpdateUserRoleService`'s existing handling of the same nullable `findById` contract.
5. No `PermissionsGuard` on this route — matches the existing precedent at `UserController.update`
   (`PUT /users/:id`).

## Tasks

### Phase 1 — Spec correction + response DTO
- [x] Fix `SPEC.md` decision #3 (and `docs/documents/auth-me-techstack.md` if it repeats the same claim):
      `findById` returns `null`, not a thrown `RoleNotFoundError`; handling is an explicit null check
- [x] `src/modules/auth/presentation/dto/me-response.dto.ts` (new) — `MeResponseDto` with
      `documentId`/`email`/`name`/`username`/`accountType`/`verified`/`roleId`/`createdAt`/`updatedAt` +
      `role: RoleResponseDto | null`; `static fromEntities(user, role)` following `UserResponseDto.fromEntity`
- [x] **Checkpoint 1:** `bun run build` succeeds (no dedicated spec file needed for a pure DTO — matches
      `RoleResponseDto`'s own precedent)

### Phase 2 — Service + controller (vertical slice)
- [ ] `src/modules/auth/application/services/get-me.service.ts` (new) — `GetMeService.execute(sub)`:
      `findById(sub)` → 401 if missing; `roleId === null` → `role: null`; else `roles.findById(roleId)` → 404
      if missing; return `{ user, role }`
- [ ] `get-me.service.spec.ts` (new) — mocked `IUserRepository`/`IRoleRepository` (same shape as
      `list-user.service.spec.ts`): happy path, `roleId: null` path, missing-user → 401, missing-role → 404
- [ ] `auth.controller.ts` — add `GET auth/me` (`@UseGuards(JwtAuthGuard)`, `@ApiCookieAuth()` on this method
      only, calls `GetMeService.execute(req.user.sub)`, maps via `MeResponseDto.fromEntities`)
- [ ] `auth.controller.spec.ts` — new test asserting the route calls `GetMeService` with `req.user.sub` and
      returns the mapped DTO, same style as this file's other tests
- [ ] `auth.module.ts` — register `GetMeService` as a provider
- [ ] **Checkpoint 2:** `bun run lint && bunx jest src/modules/auth && bun run build` all green. Manual check
      against `bun run start:dev`: login → cookies set → `GET /api/v1/auth/me` → 200 expected shape; no
      cookie → 401. Automatically-verifiable parts (lint/test/build) → commit here; manual check can trail.

### Phase 3 — Docs
- [ ] `docs/documents/auth.md` — add the new endpoint to its existing route table/section
- [ ] `docs/cms-admin-integration.md` — remove "no GET /auth/me" from known gaps; add to per-module endpoint
      reference
- [ ] **Checkpoint 3:** doc read-through, no stale "no /auth/me" mentions — commit

### Phase 4 — Five-axis review + close-out
- [ ] Five-axis review (correctness / readability / architecture / security / performance)
- [ ] Address findings
- [ ] `SPEC.md` — trim back to a one-line pointer (workflow.md step 7 cleanup)
- [ ] **Checkpoint 4 (final):** all automated checks green after any fixes; `SPEC.md` reduced to pointer —
      commit

## Verification (end-to-end)

1. `bun run lint && bun run build && bunx jest src/modules/auth` — all green.
2. `GET /api/v1/auth/me` with a valid `access_token` cookie → 200, shape matches `get-auth-me.md`'s example,
   `role` resolved fresh from DB.
3. No/invalid/expired cookie → 401 (unchanged `JwtAuthGuard` behavior).
4. Deleted user, still-valid token → 401.
5. `roleId: null` → `role: null`, 200.
6. No permission slug required to call this route.
