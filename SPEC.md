# Spec: `GET /api/v1/auth/me`

Source request: `get-auth-me.md` (CMS-Admin frontend team). Full rationale is in that file; this spec is the
build-facing distillation used to plan/implement.

## Objective

The frontend cannot answer "who is logged in, and what can they do?" after login or on a cold page reload,
because login/refresh/logout only ever return `{ message: string }` and the `access_token`/`refresh_token`
cookies are `httpOnly`. Today the FE works around this with `GET /users` + `GET /roles` and a client-side
email match, which breaks on cold reload (no email in memory to match against), requires permissions
(`user:read`, `role:read`) the current user may not hold just to identify themselves, and over-fetches the
entire user table.

Add `GET /api/v1/auth/me`: given a valid session cookie, resolve it back into the caller's own identity
(`UserResponseDto` shape) plus their resolved `role` (including its `permissions` array), in one call, with
**no permission requirement** — only "is this a valid session" gates it, since permission-gating a
"what am I allowed to do" endpoint would be circular.

Success looks like: FE calls this once on login-success and once on app-mount, gets everything it needs to
render role-gated UI, and never needs `/users` or `/roles` just to answer "who am I."

## Response Shape

```json
{
  "documentId": "…",
  "email": "user@example.com",
  "name": "Jane Doe",
  "username": "janedoe",
  "accountType": false,
  "verified": true,
  "roleId": "…",
  "role": {
    "documentId": "…",
    "name": "Editor",
    "slug": "editor",
    "level": 20,
    "permissions": ["document:read", "document:update"]
  },
  "createdAt": "…",
  "updatedAt": "…"
}
```

`role` is `null` if `user.roleId` is `null`.

## Key Design Decisions

**1. Fresh DB reads, not JWT-embedded values.** The access-token payload (`AccessTokenPayload`: `sub`,
`roleSlug`, `level`, `permissions`) doesn't carry `role.documentId` or `role.name` — fields the requested
response shape needs — so a DB lookup of the role is mandatory regardless. Given that, this endpoint returns
the *current* `RoleEntity` row's `permissions`/`level`/`slug`, not the token's. Confirmed trade-off: for up to
15 minutes after an admin edits a role's permissions (until the caller's access token naturally refreshes),
`/auth/me` can report a permission that `PermissionsGuard` (which does still read `req.user.permissions` from
the JWT) would enforce differently. Accepted — this endpoint is about *reporting current state* for UI
gating, not about being the enforcement source of truth; enforcement stays exactly as it is today.

**2. Deleted-user-mid-session → 401, not 404.** `JwtStrategy.validate()` is a pure pass-through today — no
route currently re-checks that the caller's user row still exists. This endpoint is the first to do a DB
lookup keyed on the caller's own `sub`, so it's the first place "token still valid, but the account was
deleted after it was issued" can surface. Resolved as `401 Unauthorized`, not `404`: matches the FE
integration contract's existing "401 → redirect to `/login`" handling with no new FE-side branch, and reads
as "your session is no longer valid," which is what actually happened from the caller's point of view.

**3. Orphaned `roleId` → 404, not a silent `role: null`.** `IRoleRepository.findById` does not throw when a
role is missing — it returns `null` (`prisma-role.repository.ts:23-26`). `DeleteRoleService` already refuses
to delete a role while `assignedUserCount > 0`, so a user's `roleId` pointing at a deleted role should not be
reachable through normal application flow. Still, since `findById` can return `null`, this endpoint follows
the existing precedent for handling that contract — `UpdateUserRoleService`'s explicit
`if (!newRole) throw new NotFoundException(...)` (`update-user-role.service.ts:25-28`) — rather than
downgrading a missing role to `role: null`. If the invariant is ever violated, it surfaces as a 404, not a
silently degraded response.

## Tech Stack / Where This Lives

No new dependencies. Reuses existing NestJS/Passport/Prisma stack.

- **Controller:** `AuthController` (`src/modules/auth/presentation/auth.controller.ts`) — new
  `GET auth/me` route. Every other route on this controller is deliberately public (no `@ApiCookieAuth()`
  at class level); apply `@ApiCookieAuth()` at the method level for this one route only, plus
  `@UseGuards(JwtAuthGuard)` — no `PermissionsGuard`, matching the existing no-permission-required precedent
  at `UserController.update` (`PUT /users/:id`, `src/modules/users/presentation/user.controller.ts:39-40`).
- **Service:** new `GetMeService` in `src/modules/auth/application/services/get-me.service.ts`, following
  the existing service convention (e.g. `ListUserService`) — injects `USER_REPOSITORY` and `ROLE_REPOSITORY`,
  both already available since `AuthModule` already imports `UserModule` and `RoleModule`
  (`src/modules/auth/auth.module.ts:29-30`). No module-wiring changes needed beyond registering the new
  service as a provider.
- **DTO:** new `MeResponseDto` in `src/modules/auth/presentation/dto/me-response.dto.ts` — mirrors
  `UserResponseDto`'s fields (Swagger-only shape, same pattern as `RoleResponseDto`) plus a nested `role:
  RoleResponseDto | null`, reusing `RoleResponseDto` from `src/modules/roles/presentation/dto/role-response.dto.ts`.
- **Logic:**
  1. `usersRepo.findById(req.user.sub)` → if `null`, throw `UnauthorizedException`.
  2. If `user.roleId === null`, `role = null`. Else `rolesRepo.findById(user.roleId)` → if `null`, throw
     `NotFoundException`.
  3. Map to `MeResponseDto`.

## Commands

```
Dev:   bun run start:dev
Build: bun run build
Test:  bun test  (or bunx jest <path> for a single spec file — see docs/rules/bun.md)
Lint:  bun run lint   (never bunx eslint directly — see docs/rules/workflow.md)
```

## Project Structure (files touched/added)

```
src/modules/auth/
  application/services/get-me.service.ts          (new)
  application/services/get-me.service.spec.ts      (new)
  presentation/auth.controller.ts                  (edit: add GET auth/me)
  presentation/auth.controller.spec.ts              (edit: new route's tests)
  presentation/dto/me-response.dto.ts               (new)
  auth.module.ts                                    (edit: register GetMeService)
docs/documents/auth.md                              (edit: document the new endpoint)
docs/cms-admin-integration.md                        (edit: remove "no GET /auth/me" known gap, document it)
```

## Code Style

Follow the existing service/controller/DTO conventions already in this module (constructor DI via
`@Inject(TOKEN)`, `static fromEntity()` on response DTOs, `@ApiOperation`/`@ApiResponse` on every route,
`AuthenticatedRequest` for typed `req.user`). No new patterns introduced.

## Testing Strategy

- `get-me.service.spec.ts`: unit tests with mocked `IUserRepository`/`IRoleRepository` — happy path (role
  present), `role: null` path (no `roleId`), user-not-found → `UnauthorizedException`, role-not-found →
  uncaught propagation.
- `auth.controller.spec.ts`: route wiring test (guard applied, service called, DTO shape returned) —
  same style as this controller's other route tests.
- No e2e changes required (existing `JwtAuthGuard` behavior is already covered elsewhere); a manual
  cookie-session check against a running server is reasonable at the Build checkpoint before docs/review.

## Boundaries

- **Always do:** keep `@ApiCookieAuth()` scoped to this one method (not the controller class); exclude
  `password`/`otpCodeHash`/`otpExpiresAt`/`resetTokenHash`/`resetTokenExpiresAt` from the response (same as
  `UserResponseDto.fromEntity` already does by construction); no `PermissionsGuard` on this route.
- **Ask first:** any change to `AccessTokenPayload`'s shape or to what `PermissionsGuard` trusts — out of
  scope for this feature, do not touch as a side effect.
- **Never:** widen this route's data source to any table beyond the caller's own user row and their own
  role; never accept a caller-supplied id (this is always "my own" identity, never `GET /auth/me?id=...`).

## Success Criteria

- `GET /api/v1/auth/me` with a valid `access_token` cookie returns `200` with the shape above, role
  resolved fresh from DB, in a single request (no `/users` or `/roles` calls needed).
- Missing/invalid/expired `access_token` → `401` (unchanged `JwtAuthGuard` behavior).
- Deleted user with a still-valid token → `401`.
- `roleId: null` → `role: null` in the response, `200`.
- No permission (`resource:action`) is required to call this route.

## Open Questions

None outstanding — the two judgment calls above (fresh-DB permissions, 401-on-deleted-user) were confirmed
with the user before this spec was finalized.
