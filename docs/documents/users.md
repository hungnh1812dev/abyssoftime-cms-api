# Users Module

`src/modules/users/**` — clean-architecture module for managing user accounts. Fully wired: registered in `AppModule`, all CRUD routes live, Prisma-backed, and guarded by real JWT + permission-slug authorization plus a level-hierarchy/super-admin-promotion business rule layered on top (see [Endpoints](#endpoints) and [Services & business rules](#services--business-rules)). This module is the **admin-facing CRUD surface** for user records; the end-user-facing register/verify/login/forgot-password lifecycle lives in the separate `auth` module (see [auth.md](./auth.md)) and shares the same `User` entity/repository.

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

Maps to the `User` Prisma model minus relation fields (`role`, `updatedRoles`, `updatedPermissions` aren't on the entity). No `updatedBy` field — the schema doesn't track who last updated a user record. The last four fields (`otpCodeHash`/`otpExpiresAt`/`resetTokenHash`/`resetTokenExpiresAt`) and `roleId`'s nullability were added for the `auth` module's register/verify-otp/forgot-password flows — they're appended as optional constructor params defaulting to `null` so none of this module's own call sites needed updating. **This module's own `password` handling is unchanged**: `CreateUserService`/`UpdateUserService` still round-trip `password` as a plain string with no hashing (only the `auth` module's `RegisterService`/`ResetPasswordService` hash passwords, via `bcryptjs`). Do not treat this module's create/update routes as production-ready for setting a user's password directly.

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

`create-user.dto.ts`:

- `email` — `@IsEmail()`
- `name` — `@IsString() @IsNotEmpty()`
- `username` — `@IsString() @IsNotEmpty()`
- `password` — `@IsString() @IsNotEmpty()` (plaintext; no hashing decorator)
- `accountType` — `@IsBoolean()`
- `verified` — `@IsOptional() @IsBoolean()` (service defaults to `false` when omitted)
- `roleId` — `@IsString() @IsNotEmpty()` (not validated against the roles catalog — no existence check)

`update-user.dto.ts` — same fields, all `@IsOptional()`.

## Services & business rules

All four services inject `@Inject(USER_REPOSITORY)`; `UpdateUserService`/`DeleteUserService` additionally inject `@Inject(ROLE_REPOSITORY)` (cross-module, via `RoleModule` import — see [Module wiring](#module-wiring)) for the level-hierarchy check below.

- **Create** — `409 ConflictException` if `email` already in use; `409 ConflictException` if `username` already in use. `verified` defaults to `false` if omitted. No caller-level check (creating a user isn't scoped by the target's role, since it doesn't have one yet at creation... unless `dto.roleId` sets one directly — this path is intentionally not hierarchy-checked; only `update`/`delete` are, per the approved spec).
- **Update** (`execute(documentId, dto, caller: AccessTokenPayload)`) —
  1. `404 NotFoundException` if `documentId` not found.
  2. Email/username uniqueness checks, unchanged from before (skip if unchanged from the existing value; `409` if taken by another user).
  3. **Level-hierarchy check**: if the target currently has a role (`existing.roleId` set), fetch it via `roles.findById` and require `caller.level` to be **strictly greater** than that role's `level` → `403 ForbiddenException` otherwise. Skipped if the target has no role yet (unverified account, `roleId: null`).
  4. **New-role check**: if `dto.roleId` is provided and differs from `existing.roleId`, fetch the new role. If its slug is `super_admin`, require `caller.roleSlug === "super_admin"` (see note below) — otherwise require `caller.level` strictly greater than the new role's `level` → `403` otherwise.
  5. Passes through to `IUserRepository.update`.
- **Delete** (`execute(documentId, caller: AccessTokenPayload)`) — `404` if not found; same level-hierarchy check as update's step 3 (skipped if the target has no role); then deletes. No "still referenced" guard (unlike permissions/roles — deleting a user doesn't check for dependent records).
- **List** — passthrough `findAll()`.

**Why the super_admin case skips the level check**: the seeded `super_admin` role sits at `level: 100`, which is also `CreateRoleDto`'s validated ceiling (`@Max(100)`). A literal "`caller.level` strictly greater than `newRole.level`" check can never pass when `newRole.level` is already the maximum possible value — no one could ever promote anyone to `super_admin`. Confirmed with the project owner that the `roleSlug === "super_admin"` check is meant to **replace**, not stack with, the generic level check for this one case; implemented that way in `UpdateUserService`.

## Endpoints

`presentation/user.controller.ts`, `@Controller("/api/users")`. Every route is guarded by `JwtAuthGuard` + `PermissionsGuard`; `update`/`delete` additionally take `@Req() req: AuthenticatedRequest` and pass `req.user` straight through as the `caller` argument (no extra DB lookup — the JWT payload already carries the caller's own `level`/`roleSlug`):

| Method   | Path                   | Service             | Required permission |
| -------- | ---------------------- | -------------------- | --------------------- |
| `GET`    | `/api/users`           | `ListUserService`   | `user:read`            |
| `POST`   | `/api/users`           | `CreateUserService` | `user:manager`         |
| `PUT`    | `/api/users/:id`       | `UpdateUserService` | `user:manager`         |
| `DELETE` | `/api/users/:id` (204) | `DeleteUserService` | `user:manager`         |

Holding `user:manager` is necessary but not sufficient for `update`/`delete` — the level-hierarchy (and, for role promotion, super-admin) checks in the services above are an additional, stricter authorization layer on top of the permission-slug guard.

## Module wiring

`user.module.ts` imports `RoleModule` (for `UpdateUserService`/`DeleteUserService`'s `ROLE_REPOSITORY` dependency), registers the controller and all four services, and binds `USER_REPOSITORY → PrismaUserRepository`. Exports `USER_REPOSITORY`, consumed by `AuthModule`. Imported into `src/app.module.ts`.

## Known gaps (deferred, out of scope for the current pass)

- No password hashing on this module's own create/update routes — `password` is round-tripped as plain text (only the `auth` module hashes passwords). Do not treat this module's routes as production-ready for setting a user's password directly.
- `roleId` on create/update is not validated for existence against the `roles` catalog (the level-hierarchy check in `UpdateUserService` does call `roles.findById` for a *changing* `roleId`, but there's no guard against a `roleId` that resolves to nothing — same falsy-result convention as `roles`' own services).
- No `updatedBy`/audit trail on the `User` model, unlike `Role`/`Permission`.
- Delete has no dependent-record guard.

## Tests

Unit tests (Jest, mocked `IUserRepository`/`IRoleRepository`, ≥80% branch coverage) live next to each source file: `create-user.service.spec.ts`, `update-user.service.spec.ts` (now covers the hierarchy check, the new-role check, and the super-admin-promotion carve-out), `delete-user.service.spec.ts` (hierarchy check), `list-user.service.spec.ts`, `user.controller.spec.ts` (provides a mocked `JwtTokenService` for `JwtAuthGuard` instantiation, and asserts `req.user` is forwarded as the `caller` arg), `prisma-user.repository.spec.ts` (covers `findByUsername`/`findByResetTokenHash` → `findFirst` no-unique-constraint behavior, and the OTP/reset-token field pass-through).

## Verified state (2026-07-23)

`bun run build`, `bunx tsc --noEmit`, `bunx eslint`, and `bun run test:cov` all pass with zero errors for this module.
