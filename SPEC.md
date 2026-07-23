# Spec: Default Permission/Role Seeding + Auth (Register/Login/Forgot-Password) + Permission-Slug Authorization

## Objective

Extend the existing NestJS CMS API (clean-architecture: `domain` / `application` / `infrastructure` / `presentation` per module, already established by `permissions`/`roles`/`users`) with three connected capabilities:

1. **Default permission & role seeding at boot.** On API start, upsert-if-missing six permissions (`user:manager`, `user:read`, `role:manager`, `role:read`, `permission:manager`, `permission:read`) and four roles (`super_admin`, `admin`, `editor`, `guest`) with the fixed permission sets given below. Idempotent — safe to run on every boot, only inserts what's missing.
2. **Auth lifecycle:** register, email verification via OTP, login (JWT access+refresh via httpOnly cookies), forgot/reset password via emailed link. Role assignment is deferred to successful OTP verification: the first-ever user to verify is auto-assigned `super_admin`; every subsequent user defaults to `guest`.
3. **Permission-slug authorization.** A `PermissionsGuard` + `@RequirePermissions(...)` decorator, applied to `users`/`roles`/`permissions` mutating (and read) routes, replacing the existing numeric-`level`-based checks in the `roles` module.

Success = default data seeds correctly on a clean DB, a first-registered user can verify their email via OTP and log in, `super_admin` can manage users/roles/permissions while `guest`/`editor` cannot, `bun run build`/`bun run lint`/`bun run test:cov` all pass, and branch coverage on new module code is ≥80%, consistent with the existing gate pattern in `package.json`.

## Assumptions (confirmed via clarifying questions — correct me now if any are wrong)

Confirmed directly:

- **`updatedBy` FK chicken-and-egg:** `Role.updatedBy` / `Permission.updatedBy` become **nullable** in all three `prisma/*/schema.prisma` files (schema migration). Boot-seeded rows get `updatedBy: null`; rows edited by a real user still set their `documentId`.
- **Login mechanism:** JWT access + refresh tokens, both set as httpOnly cookies, using the already-declared-but-unused env vars `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `COOKIE_SECURE`, `COOKIE_SAMESITE`.
- **Password hashing:** `bcrypt`.
- **Authorization scope:** The new `PermissionsGuard` **replaces** the existing level-based `403` checks in `CreateRoleService`/`UpdateRoleService`/`DeleteRoleService` (and is newly added to `permissions` and `users` mutating routes, which currently have no auth check at all). The `level` field stays on `RoleEntity`/schema (unused for authorization going forward, still validated 0–100 on create/update as before) — removing it entirely is out of scope.

Additional calls made to keep the spec concrete (flag any you want changed):

- **New `User` fields** (schema migration, all 3 providers): `otpCodeHash` (`String?`), `otpExpiresAt` (`DateTime?`), `resetTokenHash` (`String?`), `resetTokenExpiresAt` (`DateTime?`), and `roleId` becomes **nullable** (`String?`, relation optional) — see role-assignment timing below.
- **OTP:** 6-digit numeric, bcrypt-hashed at rest, 10-minute expiry, single-use (cleared after successful verify). Unverified users (`verified: false`) **cannot log in** — login returns `403` with a distinct, explicit message ("email not verified, please check your inbox") rather than a generic invalid-credentials error, so the client can route the user to the verify-OTP screen instead of just showing "login failed."
- **Password reset token:** opaque `crypto.randomBytes(32).toString("hex")`, SHA-256-hashed at rest (not bcrypt — it's a high-entropy random token, not a low-entropy secret needing slow hashing), 1-hour expiry, single-use.
- **Role assignment happens at verification, not registration.** `RegisterService` creates the `User` row with `roleId: null`, `verified: false`, plus the hashed OTP. `VerifyOtpService` is what sets `roleId` (and `verified: true`) once the OTP check passes. "First user" is now evaluated at verification time, not registration time: if no other user row has `roleId` set (i.e., no one has completed verification yet), this user becomes `super_admin`; otherwise `guest`. This means whichever registrant *verifies* first gets `super_admin`, not necessarily whichever *registered* first — flag if you intended registration order specifically, but deferring role assignment to post-verification (per your instruction) makes verification order the only consistent way to define "first."
- **Level-hierarchy check on User updates/deletes, scoped to the `users` module only** (the `roles`/`permissions` modules stay purely permission-slug-guarded, per the earlier decision): even when the caller holds `user:manager`, `UpdateUserService`/`DeleteUserService` additionally require the caller's own role `level` to be strictly greater than the **target user's current role level**. Two roles can both hold `user:manager`, but the lower-`level` one still cannot modify/delete a user whose assigned role has an equal-or-higher `level`. If `dto.roleId` changes the target's role, the same check also applies to the *new* role's level. If the target user has no role yet (unverified, `roleId: null`), there's nothing to compare — the check is skipped. The existing super-admin-only-promotes-to-super_admin rule (below) is an additional, stricter check layered on top of this general one.
- **Tokens are fully stateless — confirmed, no server-side store.** No `RefreshToken`/session table. Access/refresh JWTs are never persisted; each request is authenticated by verifying the cookie's signature/expiry on the fly (`JwtAuthGuard`). "Secure method" means: httpOnly + `Secure` (per `COOKIE_SECURE`) + `SameSite` (per `COOKIE_SAMESITE`) cookies, short-lived access token, longer-lived refresh token, secrets never logged or returned in any response body. A leaked refresh token remains valid until natural expiry (no revocation) — accepted tradeoff, not a gap to fix later.
- **Email module (deferred, per your note):** a small port/adapter pair — `IEmailSender` interface (`sendOtpEmail`, `sendPasswordResetEmail`) with a `ConsoleEmailSender` stub implementation that logs to the Nest logger instead of sending real email. Swapping in a real provider later is a drop-in replacement of the one binding in `auth.module.ts`.
- **New dependencies** (all "ask first" per this project's boundaries — flagging here for spec approval rather than a separate mid-build ask): `bcrypt` (+ `@types/bcrypt`), `@nestjs/jwt`, `cookie-parser` (+ `@types/cookie-parser`).
- **Rate limiting:** the existing-but-unused `RATE_LIMIT_FPS`/`RATE_LIMIT_BURST` env vars are wired into a small hand-rolled in-memory token-bucket `RateLimitGuard` (no new package), applied per-IP+per-route to `register`, `login`, `verify-otp`, `resend-otp`, `forgot-password`, `reset-password`.
- **Read vs. write permission mapping:** `GET` routes require `resource:read` **or** `resource:manager` (manager implies read); mutating routes require `resource:manager`. Example: `admin`'s default set (`user:read, role:read, permission:read`) can list but not create/update/delete anything.
- **Super-admin promotion rule:** literal reading of "super_admin can promo another user upto super_admin" — assigning a target user's `roleId` to the `super_admin` role requires the **caller's own role slug** to be exactly `super_admin` (checked in addition to, not instead of, holding `user:manager` and the level-hierarchy check above). Any other role holding `user:manager` in the future still cannot promote someone to `super_admin`.
- **Session TTLs:** access token ~15 min, refresh token ~7 days; refresh endpoint reissues an access token (and rotates the refresh token) from the refresh cookie; logout clears both cookies.
- **Public vs. protected routes:** `register`, `login`, `refresh`, `verify-otp`, `resend-otp`, `forgot-password`, `reset-password`, and `has-users` are unauthenticated. Everything under `/api/users`, `/api/roles`, `/api/permissions` requires a valid access-token cookie (`JwtAuthGuard`) plus the relevant permission slug (`PermissionsGuard`).
- `editor` and `guest` ship with `permissions: []` exactly as specified (no default capabilities beyond being logged in).

## Tech Stack

- NestJS 11, TypeScript (strict null checks), Prisma 7 (Postgres/MySQL/SQLite driver adapters — schema changes must land in all three `prisma/{postgresql,mysql,sqlite}/schema.prisma` files)
- `class-validator` / `class-transformer` for DTOs
- **New:** `bcrypt`, `@nestjs/jwt`, `cookie-parser` (see Assumptions)
- Jest 30 + ts-jest + `@nestjs/testing` for unit tests
- Bun as the runtime/package manager for everything else (per project CLAUDE.md)

## Commands

```
Install:            bun install
Dev:                 bun run start:dev
Build:               bun run build
Lint:                bun run lint
Test:                bun run test
Coverage:            bun run test:cov
Prisma migrate (dev): bun run prisma:migrate   (run once per provider you're testing against)
```

## Project Structure

New `auth` module, following the established per-module layout:

```
src/modules/auth/
  domain/
    ports/email-sender.port.ts        → IEmailSender interface + DI token
  application/
    dto/register.dto.ts
    dto/login.dto.ts
    dto/verify-otp.dto.ts
    dto/resend-otp.dto.ts
    dto/forgot-password.dto.ts
    dto/reset-password.dto.ts
    services/register.service.ts
    services/login.service.ts
    services/refresh-token.service.ts
    services/logout.service.ts
    services/verify-otp.service.ts
    services/resend-otp.service.ts
    services/forgot-password.service.ts
    services/reset-password.service.ts
    services/has-users.service.ts
  infrastructure/
    email/console-email.sender.ts     → IEmailSender stub (logs, no real send)
    token/jwt-token.service.ts        → wraps @nestjs/jwt: sign/verify access+refresh
  presentation/
    auth.controller.ts
  auth.module.ts
```

Cross-module shared auth primitives (kept out of `auth/` so `users`/`roles`/`permissions` don't have to import the `auth` module directly, preserving "each module independent"):

```
src/common/
  guards/jwt-auth.guard.ts            → validates access-token cookie, populates req.user
  guards/permissions.guard.ts         → reads @RequirePermissions metadata, checks req.user.permissions
  guards/rate-limit.guard.ts          → in-memory token-bucket, keyed by IP+route
  decorators/require-permissions.decorator.ts
  types/authenticated-request.ts      → real req.user shape, supersedes the ad-hoc placeholder type currently inlined in role.controller.ts
```

Boot-time seeding (app-level concern, not owned by any single module — reads/writes both `permissions` and `roles` repositories):

```
src/bootstrap/
  seed-default-data.service.ts        → OnApplicationBootstrap, upsert-if-missing permissions then roles
  seed.module.ts                      → imports PermissionModule + RoleModule, registers the seeder
```

Schema changes (all three): `Role.updatedBy` / `Permission.updatedBy` → nullable; `User.roleId` → nullable (relation optional); new nullable `User` fields `otpCodeHash`, `otpExpiresAt`, `resetTokenHash`, `resetTokenExpiresAt`.

Note: `register.service.ts` no longer sets `roleId` — it creates the user with `roleId: null`. `verify-otp.service.ts` is what resolves and assigns the role (`super_admin` if no other user has a role yet, else `guest`) and flips `verified: true`.

Tests live next to the file under test as `*.spec.ts`, same as existing modules.

## Code Style

Match existing formatting exactly (Prettier: 180 print width, double quotes off, import order third-party → `@nestjs/*` → `@/*` → relative). Guard + decorator usage should read like this:

```ts
@Controller("/api/roles")
export class RolesColtroller {
  @Post()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions("role:manager")
  create(@Body() dto: CreateRoleDto, @Req() req: AuthenticatedRequest) {
    return this.createRoleService.execute(dto, req.user);
  }
}
```

Services keep throwing Nest `HttpException` subclasses directly (established convention); guards throw `ForbiddenException`/`UnauthorizedException` before the controller method body runs.

## Testing Strategy

- **Framework:** Jest via `bun run test` / `bun run test:cov`, unchanged config shape.
- **Level:** Pure unit tests — services, guards, and the seeder, with repository interfaces and `IEmailSender`/`JwtTokenService` mocked. No real DB, no real email, no real JWT signing in unit tests (mock `JwtTokenService`).
- **What gets tests:** every new service in `auth` (all branches: user-not-found, wrong-password, unverified-login-block, expired/invalid OTP, expired/invalid reset token, first-user-becomes-super_admin vs. subsequent-user-becomes-guest), `PermissionsGuard` (permission present/absent/manager-implies-read), `JwtAuthGuard` (valid/missing/expired cookie), `RateLimitGuard` (under/at/over burst), `SeedDefaultDataService` (nothing exists → inserts all; partially exists → only inserts missing; fully exists → no-op).
- **Coverage gate:** extend `package.json`'s scoped `coverageThreshold` with entries for `src/modules/auth/application/**`, `src/common/guards/**`, and `src/bootstrap/**` at ≥80% branches, following the exact pattern already used for `users`/`roles`/`permissions`.
- No e2e tests in this pass (consistent with how the prior `users`/`roles`/`permissions` work was scoped) — flag if you want e2e coverage for the login/register flow added as a follow-up.

## Boundaries

- **Always:** hash passwords and OTP codes before persisting them (never store or log plaintext); mock repositories/ports in unit tests, never hit a real DB or send real email; run `bun run test:cov`, `bun run lint`, `bun run build` before considering this done; keep all three `prisma/*/schema.prisma` files in sync for every schema change.
- **Ask first:** running `bun run prisma:migrate` against any real/shared database (fine against a local dev DB, confirm before anything else); adding any dependency beyond the three named above; changing `JWT_ACCESS_SECRET`/`JWT_REFRESH_SECRET`/`COOKIE_*` env var semantics; touching the existing `level`-based fields/validation on `Role` beyond removing their use in authorization checks.
- **Never:** commit `.env*` files or secrets; return password hashes, OTP hashes, or reset-token hashes in any API response; log raw OTP codes or reset tokens outside the explicitly-stubbed `ConsoleEmailSender` (which exists only because real email is deferred, per your note); weaken or delete a failing test to hit the coverage number; rename existing typo'd symbols (`role.entiry.ts`, `RolesColtroller`, `PERMISSSION_REPOSITORY`, `dalateRoleService`) as unrequested cleanup.

## Success Criteria

- [ ] `bun run start:dev` against a clean DB seeds exactly 6 permissions and 4 roles with the specified slugs/permission-sets; re-running boot on a non-clean DB inserts nothing new (idempotent).
- [ ] `POST /api/auth/register` creates a user with `roleId: null`, `verified: false` — no role is assigned at this point.
- [ ] `POST /api/auth/verify-otp` with the correct, unexpired OTP sets `verified: true` and assigns `roleId`: `super_admin` if this is the first user ever to complete verification, `guest` otherwise. Expired/incorrect OTP is rejected and leaves the user unverified/unassigned.
- [ ] `POST /api/auth/login` before verification returns `403` with an explicit "email not verified" message (distinct from invalid-credentials `401`).
- [ ] `GET /api/auth/has-users` returns `true` when the `users` table is empty, `false` otherwise.
- [ ] `POST /api/auth/login` sets access+refresh httpOnly cookies on success; `POST /api/auth/refresh` reissues an access token from a valid refresh cookie; `POST /api/auth/logout` clears both cookies. No token is persisted server-side at any point.
- [ ] `POST /api/auth/forgot-password` + `POST /api/auth/reset-password` round-trip a reset token (delivered via `ConsoleEmailSender` for now) to change a user's password.
- [ ] `role:manager`/`permission:manager`/`user:manager` gate writes; `role:read`/`permission:read`/`user:read` (or the corresponding `:manager`) gate reads; `guest`/`editor` (empty permissions) get `403` on all of `/api/users`, `/api/roles`, `/api/permissions`.
- [ ] A caller holding `user:manager` still gets `403` updating/deleting a user whose assigned role has an equal-or-higher `level` than the caller's own role.
- [ ] Only a caller whose own role slug is `super_admin` can set another user's `roleId` to the `super_admin` role.
- [ ] `bun run build` / TypeScript compiles with no errors; `bun run lint` passes with no new errors.
- [ ] `bun run test:cov` passes; branch coverage ≥80% on `src/modules/auth/application`, `src/common/guards`, `src/bootstrap`.

## Open Questions

None outstanding. All prior open questions are approved as drafted: OTP (6 digits, 10-minute expiry), reset token (1-hour expiry), stateless JWT with no server-side revocation store, and rate-limit buckets scoped per-IP+per-route using `RATE_LIMIT_FPS`/`RATE_LIMIT_BURST`. Flag here if anything new comes up during planning/implementation.
