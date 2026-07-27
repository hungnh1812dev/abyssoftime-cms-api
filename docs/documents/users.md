# Users Module

`src/modules/users/**` — clean-architecture module for managing user accounts. Fully wired: registered in `AppModule`, update/role-assignment/delete/list routes are live, Prisma-backed, and guarded by real JWT + permission-slug authorization (see [Endpoints](#endpoints) and [Services & business rules](#services--business-rules)). This module is the **admin-facing surface** for existing user records; account creation is public-only, via the separate `auth` module's register/verify-otp flow (see [auth.md](./auth.md)), which shares the same `User` entity/repository. There is no admin-facing create-user route — `POST /api/users` was removed (see [Removed: POST /api/users](#removed-post-apiusers) below).

`email`/`username` are permanent, immutable identifiers once a user is created — no route on this module (or `auth`) ever changes them. `accountType`/`verified`/`roleId` are internal/fixed on this module's update routes: `verified` only ever flips via `auth`'s self-serve `resend-otp`/`verify-otp` flow; `accountType` is a placeholder reserved for a future OAuth (Google/Facebook) account-type flag, not implemented yet, and stays a fixed `false`; `roleId` is set only via the dedicated `PATCH /api/users/:id/role` endpoint (see below).

## Entity

`domain/entities/user.entity.ts` — `UserEntity`:

| Field                 | Type             |
| --------------------- | ---------------- |
| `documentId`          | `string`         |
| `email`               | `string`         |
| `name`                | `string`         |
| `username`            | `string`         |
| `password`            | `string`         |
| `accountType`         | `boolean`        |
| `verified`            | `boolean`        |
| `roleId`              | `string \| null` |
| `createdAt`           | `Date`           |
| `updatedAt`           | `Date`           |
| `otpCodeHash`         | `string \| null` |
| `otpExpiresAt`        | `Date \| null`   |
| `resetTokenHash`      | `string \| null` |
| `resetTokenExpiresAt` | `Date \| null`   |

Maps to the `User` Prisma model minus relation fields (`role`, `updatedRoles`, `updatedPermissions` aren't on the entity). No `updatedBy` field — the schema doesn't track who last updated a user record. The last four fields (`otpCodeHash`/`otpExpiresAt`/`resetTokenHash`/`resetTokenExpiresAt`) and `roleId`'s nullability were added for the `auth` module's register/verify-otp/forgot-password flows — they're appended as optional constructor params defaulting to `null` so none of this module's own call sites needed updating. **This module's own `password` handling is unchanged**: `UpdateUserService` still round-trips `password` as a plain string with no hashing (only the `auth` module's `RegisterService`/`ResetPasswordService` hash passwords, via `bcryptjs`). Do not treat this module's update route as production-ready for setting a user's password directly.

## Repository

`domain/repositories/user.repository.ts` — interface `IUserRepository`, DI token `USER_REPOSITORY` (no typo):

- `findAll(): Promise<UserEntity[]>`
- `findById(documentId): Promise<UserEntity | null>`
- `findByEmail(email): Promise<UserEntity | null>`
- `findByUsername(username): Promise<UserEntity | null>`
- `findByResetTokenHash(resetTokenHash): Promise<UserEntity | null>` — added for `auth`'s `ResetPasswordService`; uses `findFirst` (no unique constraint on the column), same pattern as `findByUsername`.
- `create(data: CreateUserData): Promise<UserEntity>`
- `update(documentId, data: UpdateUserData): Promise<UserEntity>`
- `delete(documentId): Promise<void>`
- `count(): Promise<number>`
- `hasAnyVerified(): Promise<boolean>` — added for `auth`'s `VerifyOtpService` ("first user to verify" check); `prisma.user.count({ where: { verified: true } }) > 0`.

`CreateUserData`/`UpdateUserData` both gained optional `otpCodeHash`/`otpExpiresAt` fields (`UpdateUserData` additionally `resetTokenHash`/`resetTokenExpiresAt`) for the same reason as the entity — this module's own services never set them (they stay `undefined`, which Prisma/Jest's equality checks treat as absent).

Implementation: `infrastructure/persistence/prisma-user.repository.ts` (`PrismaUserRepository`). `findByEmail` uses `prisma.user.findUnique` (`email` is `@unique` in the schema); `findByUsername`/`findByResetTokenHash` use `prisma.user.findFirst` — neither column has a unique constraint in `prisma/postgresql/schema.prisma`, so `findUnique` isn't available there.

## DTOs

`update-user.dto.ts`:

- `name?` — `@IsOptional() @IsString() @IsNotEmpty()`
- `password?` — `@IsOptional() @IsString() @IsNotEmpty()`

`email`/`username`/`accountType`/`verified`/`roleId` are **not** on this DTO either, for the same whitelist-rejection reason — `email`/`username` are permanently immutable, and `roleId` moves to `update-user-role.dto.ts` below.

`update-user-role.dto.ts`:

- `roleId` — `@IsString() @IsNotEmpty()`, required. Triggers the level-hierarchy / super-admin-promotion check described below when it differs from the user's current role.

## Services & business rules

- **Update** (`UpdateUserService`, injects `USER_REPOSITORY` only) — `execute(documentId, dto, caller: AccessTokenPayload)`:
  1. **Self-or-manager check**: if `documentId !== caller.sub` (caller isn't updating their own record) and `caller.permissions` doesn't include `user:manager` → `403 ForbiddenException`. Runs **before** the existence lookup, deliberately — since this route dropped `PermissionsGuard` (see [Endpoints](#endpoints)), any authenticated user can now reach this service, so checking authorization first prevents an unauthorized caller from distinguishing "this documentId exists" (403) from "it doesn't" (404) by probing arbitrary IDs.
  2. `404 NotFoundException` if `documentId` not found.
  3. Passes `{ name: dto.name, password: dto.password }` through to `IUserRepository.update` — nothing else is ever written by this route.

  No role-repository dependency, no level-hierarchy check, no email/username uniqueness check on this route anymore — those existed only to gate identifier/role changes that no longer happen here.
- **Assign role** (`UpdateUserRoleService`, injects `USER_REPOSITORY` + `ROLE_REPOSITORY`) — `execute(documentId, dto, caller: AccessTokenPayload)`:
  1. `404 NotFoundException` if `documentId` not found.
  2. `404 NotFoundException` if `dto.roleId` doesn't resolve to an existing role (closes the "no existence check" gap the old `UpdateUserService` had).
  3. **Current-role hierarchy check**: if the target currently has a role, fetch it and require `caller.level` to be **strictly greater** than that role's `level` → `403` otherwise. Skipped if the target has no role yet.
  4. **New-role check**: if `dto.roleId` differs from the target's current `roleId` — if the new role's slug is `super_admin`, require `caller.roleSlug === "super_admin"` (see note below); otherwise require `caller.level` strictly greater than the new role's `level` → `403` otherwise.
  5. `IUserRepository.update(documentId, { roleId: dto.roleId })`.

  This is the same level-hierarchy/super-admin-promotion logic `UpdateUserService` used to run before `roleId` changes moved to their own endpoint — relocated wholesale, not rewritten, plus the new existence check in step 2.
- **Delete** (`DeleteUserService`, injects `USER_REPOSITORY` + `ROLE_REPOSITORY`, unchanged by this cycle) — `404` if not found; same level-hierarchy check as assign-role's step 3 (skipped if the target has no role); then deletes. No "still referenced" guard (unlike permissions/roles — deleting a user doesn't check for dependent records).
- **List** — passthrough `findAll()`.

**Why the super_admin case skips the level check**: the seeded `super_admin` role sits at `level: 100`, which is also `CreateRoleDto`'s validated ceiling (`@Max(100)`). A literal "`caller.level` strictly greater than `newRole.level`" check can never pass when `newRole.level` is already the maximum possible value — no one could ever promote anyone to `super_admin`. Confirmed with the project owner that the `roleSlug === "super_admin"` check is meant to **replace**, not stack with, the generic level check for this one case; implemented that way in `UpdateUserRoleService`.

## Endpoints

`presentation/user.controller.ts`, `@Controller("/api/users")`.

| Method   | Path                        | Service                | Auth                                              |
| -------- | --------------------------- | ----------------------- | -------------------------------------------------- |
| `GET`    | `/api/users`                | `ListUserService`      | `JwtAuthGuard` + `PermissionsGuard("user:read")`   |
| `PUT`    | `/api/users/:id`            | `UpdateUserService`    | `JwtAuthGuard` only — self-or-`user:manager` is checked inside the service, not the guard |
| `PATCH`  | `/api/users/:id/role`       | `UpdateUserRoleService`| `JwtAuthGuard` + `PermissionsGuard("user:role_manager")` |
| `DELETE` | `/api/users/:id` (204)      | `DeleteUserService`    | `JwtAuthGuard` + `PermissionsGuard("user:manager")`|

`update`/`updateRole`/`delete` all take `@Req() req: AuthenticatedRequest` and pass `req.user` straight through as the `caller` argument (no extra DB lookup — the JWT payload already carries the caller's own `sub`/`level`/`roleSlug`/`permissions`).

`PUT :id` deliberately drops `PermissionsGuard` — `PermissionsGuard` is a documented no-op when a route has no `@RequirePermissions` metadata (`src/common/guards/permissions.guard.ts`), so leaving it attached with no metadata would be a silently-inert guard. Authorization for this route is "the caller's own record, or any record if `caller.permissions` includes `user:manager`", which only the service can evaluate (it needs `documentId` vs. `caller.sub`).

`list`/`update`/`updateRole` map their `UserEntity` result through `presentation/user-response.dto.ts` (`UserResponseDto.fromEntity`) before returning it — a manual E2E pass caught this controller returning the raw entity, which leaked `password` (the bcrypt hash), `otpCodeHash`, `otpExpiresAt`, `resetTokenHash`, and `resetTokenExpiresAt` directly in API responses, violating the "never return password/OTP/reset-token hashes" rule that the `auth` module's own routes already honored correctly. `UserResponseDto` only carries `documentId`/`email`/`name`/`username`/`accountType`/`verified`/`roleId`/`createdAt`/`updatedAt`.

## Module wiring

`user.module.ts` imports `RoleModule` (for `UpdateUserRoleService`/`DeleteUserService`'s `ROLE_REPOSITORY` dependency), registers the controller and all four services (`ListUserService`, `UpdateUserService`, `UpdateUserRoleService`, `DeleteUserService`), and binds `USER_REPOSITORY → PrismaUserRepository`. Exports `USER_REPOSITORY`, consumed by `AuthModule`. Imported into `src/app.module.ts`.

## Removed: `POST /api/users`

This module previously had an admin-only `POST /api/users` route (`CreateUserService`/`CreateUserDto`, guarded by `JwtAuthGuard` + `PermissionsGuard("user:manager")`) for creating a user record on someone else's behalf. It was removed as redundant: the account it produced still had to self-verify via `auth`'s `resend-otp`/`verify-otp` flow before becoming usable, which is exactly what public `POST /api/auth/register` already does end-to-end (see [auth.md](./auth.md)). There is now exactly one way to create a `User` record — public self-registration through the `auth` module.

## Known gaps (deferred, out of scope for the current pass)

- No password hashing on this module's own update route — `password` is round-tripped as plain text (only the `auth` module hashes passwords). Do not treat this module's route as production-ready for setting a user's password directly.
- No `updatedBy`/audit trail on the `User` model, unlike `Role`/`Permission`.
- Delete has no dependent-record guard.
- The boot-time seeder (`SeedDefaultDataService`) only creates roles/permissions that don't already exist by slug — it never patches an already-seeded role's `permissions` array. A dev/prod database seeded before the `user:role_manager` permission was added needs `super_admin`'s role record updated manually (via `PUT /api/roles/:id`) to actually gain the new permission; a fresh database seeds correctly from first boot. This is a pre-existing seeder limitation, not new to this permission.

## Tests

Unit tests (Jest, mocked `IUserRepository`/`IRoleRepository`, ≥80% branch coverage) live next to each source file: `update-user.service.spec.ts` (self-or-manager authorization only, no role logic), `update-user-role.service.spec.ts` (the relocated hierarchy/new-role-check/super-admin-promotion cases, plus the new roleId-not-found 404), `delete-user.service.spec.ts` (hierarchy check), `list-user.service.spec.ts`, `user.controller.spec.ts` (provides a mocked `JwtTokenService` for `JwtAuthGuard` instantiation, one delegation test per route, asserts every response is the mapped `UserResponseDto` shape with no `password` property), `user-response.dto.spec.ts` (asserts `fromEntity` strips all five sensitive fields), `user.module.spec.ts` (provider/import wiring), `prisma-user.repository.spec.ts` (covers `findByUsername`/`findByResetTokenHash` → `findFirst` no-unique-constraint behavior, and the OTP/reset-token field pass-through).

## Review notes

A five-axis code review (`agent-skills:code-reviewer`) flagged one real, low-severity issue: `UpdateUserService` originally ran its existence lookup before the self-or-manager authorization check, which — now that `PermissionsGuard` no longer gates this route — let any authenticated caller distinguish an existing `documentId` (403) from a missing one (404). Fixed by reordering (see [Services & business rules](#services--business-rules) above). Also added a defensive `caller.permissions ?? []` fallback for consistency with `PermissionsGuard`'s own pattern, and an explicit test in `update-user-role.service.spec.ts` pinning that a caller can't reassign their own role (previously only incidentally covered by the generic hierarchy-check test). No Critical/Important findings.

## Verified state (2026-07-27)

Following removal of `POST /api/users` (`CreateUserService`/`CreateUserDto`): `bun run build`, `bun run test` (642 tests, 116 suites), and `bun run lint` all pass with zero errors (one pre-existing, unrelated warning in `src/main.ts`).
