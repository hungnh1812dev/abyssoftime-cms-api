# Plan: Default Seeding + Auth (Register/Verify/Login/Forgot-Password) + Permission-Slug Authorization

See `SPEC.md` for the full approved spec. This plan implements it.

## Context

`SPEC.md` asks for three connected things on top of the existing `permissions`/`roles`/`users` modules: (1) idempotent boot-time seeding of 6 default permissions + 4 default roles, (2) a full auth lifecycle (register → OTP-verify → login → forgot/reset password, all JWT/cookie-based, email deferred to a console stub), and (3) a permission-slug authorization system that replaces the `roles` module's current numeric-`level` checks and newly gates the previously-unguarded `permissions`/`users` write and read routes. Codebase research turned up a few facts that refine — but don't contradict — the spec, and one currently-open gap (no global `ValidationPipe`) that this work depends on being fixed to function correctly.

## Research findings that change the plan

1. **`mysql`/`sqlite` schema files have zero models today** (just `generator`/`datasource` stubs) — `Permission`/`Role`/`User` only exist in `prisma/postgresql/schema.prisma`. The existing `permissions`/`roles`/`users` modules were never backfilled into mysql/sqlite either. **Plan deviates from SPEC.md's "all three files" wording: schema changes land in `prisma/postgresql/schema.prisma` only**, matching how every prior module was actually built.
2. **No global `ValidationPipe` exists anywhere** (`src/main.ts` is 5 lines: `NestFactory.create` + `listen`). Every DTO's `class-validator` decorators are currently inert. This plan adds `app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }))` as a small prerequisite step — a behavior change to every existing endpoint (previously-permissive requests will start getting rejected), low risk since nothing in the repo currently depends on that leniency.
3. **`Bun.password` is unusable in this project's test suite.** `bun run test` runs Jest, and Jest's `testEnvironment: "node"` executes every test file under a real Node.js process (confirmed empirically: `process.execPath` resolves to the system Node binary, and `Bun` is `undefined` inside test files) — regardless of the fact that `bun run test` itself is invoked via the Bun CLI. Any application code calling `Bun.password.hash()`/`.verify()` throws `ReferenceError: Bun is not defined` the moment a unit test exercises it. **Plan reverts to the originally-approved `bcryptjs` npm package** (pure-JS, no native compilation, portable across Bun and Node) instead of `Bun.password`. `@nestjs/jwt`, `cookie-parser` (+`@types/cookie-parser`), `bcryptjs` (+`@types/bcryptjs`) are the new dependencies.
4. **Access tokens embed `roleSlug`, `level`, and `permissions[]` in the JWT payload** (signed at login/refresh, verified by `JwtAuthGuard` with zero DB calls per request). A role's permission changes take up to ~15 min (access-token TTL) to apply to already-logged-in users of that role; refresh tokens carry only `{ sub: documentId }` and `RefreshTokenService` re-fetches the user+role fresh from DB on every refresh.
5. **`JwtTokenService` lives in `src/common/token/`**, not under `auth/infrastructure/` — putting it inside `auth` would force `src/common/guards/jwt-auth.guard.ts` to import from inside the `auth` module, violating "each module independent." `AuthModule` uses the shared service to sign, `JwtAuthGuard` uses the same instance to verify.

## Architecture Decisions

- **Schema scope**: postgresql only (see finding 1).
- **Password/OTP hashing**: `bcryptjs` (see finding 3 — `Bun.password` doesn't work under Jest). Reset tokens stay SHA-256 (Node `crypto`, already a global).
- **New dependencies**: `@nestjs/jwt`, `cookie-parser`, `@types/cookie-parser`.
- **Shared kernel**: new `src/common/` directory (guards, decorators, the JWT token service, the `AuthenticatedRequest`/`JwtPayload` types) — owned by neither `auth` nor `users`/`roles`/`permissions`, importable via the existing `@/` path alias.
- **OTP/reset-token storage**: plain nullable columns on `User` (`otpCodeHash`, `otpExpiresAt`, `resetTokenHash`, `resetTokenExpiresAt`) — no new Prisma models.
- **Role assignment timing**: `RegisterService` creates `roleId: null`; `VerifyOtpService` assigns the role. "First user" = first user whose `verified` flips `true` (new `IUserRepository.hasAnyVerified()` method).
- **Authorization**: `PermissionsGuard` + `@RequirePermissions(slug)` fully replaces the level-based `403` checks in `CreateRoleService`/`UpdateRoleService`/`DeleteRoleService`; newly applied to `permissions` and `users` controllers. `users` module additionally gets a level-hierarchy check (caller's role `level` must be strictly greater than the target user's current — and, if changing, new — role `level`) and a super-admin-only-promotes-to-super_admin rule, both live inside `UpdateUserService`/`DeleteUserService`.

## Dependency Graph

```
Schema migration (postgresql only) + ValidationPipe/cookie-parser bootstrap
    │
    ├── Boot-time seeder (needs nullable updatedBy to seed before any User exists)
    │       │
    │       └── (roles/permissions catalog now exists for everything below)
    │
    └── src/common/ (JwtTokenService, JwtAuthGuard, PermissionsGuard, RateLimitGuard)
            │
            ├── auth: register + verify-otp + has-users (needs seeded roles to assign)
            │       │
            │       ├── auth: login + refresh + logout (needs verified users to exist)
            │       │
            │       └── auth: forgot/reset password (independent of login, needs email port)
            │
            └── Permission-slug guard rollout onto roles/permissions/users controllers
                    (needs JwtAuthGuard functional — i.e. login working — to test end-to-end)
```

## Task List

### Phase 0: Foundation

**Task 0.1 — Bootstrap wiring + new dependencies.** Add `@nestjs/jwt`, `cookie-parser`, `@types/cookie-parser` via `bun add`. Register `app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }))` and `app.use(cookieParser())` in `src/main.ts`.
- Acceptance: `bun run build` succeeds; a malformed body against an existing endpoint now returns `400` instead of passing through.
- Files: `package.json`, `src/main.ts`.

**Task 0.2 — Schema migration.** In `prisma/postgresql/schema.prisma`: make `Role.updatedBy`/`Permission.updatedBy` optional (`String?`, relation optional); make `User.roleId` optional (`String?`, relation optional); add `otpCodeHash String?`, `otpExpiresAt DateTime?`, `resetTokenHash String?`, `resetTokenExpiresAt DateTime?` to `User`. Update domain layer to match: `PermissionEntity.updatedBy`/`RoleEntity.updatedBy` → `string | null`; `UserEntity.roleId` → `string | null`; the `Create*Data`/`Update*Data` interfaces' `updatedBy`/`roleId` widened accordingly; `toEntity()` mappers in all three Prisma repos updated. Run `bun run prisma:generate`, then **ask before** running `bun run prisma:migrate` against the local dev DB.
- Acceptance: `bun run build`/`bunx tsc --noEmit` compiles clean; existing `permissions`/`roles`/`users` test suites still pass.
- Files: `prisma/postgresql/schema.prisma`, `permission.entity.ts`, `permission.repository.ts`, `prisma-permission.repository.ts`, `role.entiry.ts`, `role.repository.ts`, `prisma-role.repository.ts`, `user.entity.ts`, `user.repository.ts`, `prisma-user.repository.ts`.

**Checkpoint 0:** `bun run build`, `bun run lint`, `bun run test:cov` all pass, zero regressions. Confirm with human before migrating any real database.

### Phase 1: Boot-time default data seeding

**Task 1.1 — Seeder.** `src/bootstrap/seed-default-data.service.ts` (`OnApplicationBootstrap`, injects `PERMISSSION_REPOSITORY`/`ROLE_REPOSITORY`): upsert-if-missing 6 permissions (`user:manager`, `user:read`, `role:manager`, `role:read`, `permission:manager`, `permission:read`) then 4 roles (`super_admin` → all 3 `:manager`, `admin` → all 3 `:read`, `editor`/`guest` → `[]`), `updatedBy: null`, `isDefault: true`, levels `guest=0, editor=0, admin=50, super_admin=100` (confirm exact numbers during build). `src/bootstrap/seed.module.ts` imports `PermissionModule` + `RoleModule`. Add to `AppModule`.
- Files: `src/bootstrap/seed-default-data.service.ts`, `src/bootstrap/seed.module.ts`, `src/app.module.ts`.

**Task 1.2 — Seeder tests + coverage gate.** Mock repositories; cover nothing-exists / partially-exists / fully-exists branches. Add `src/bootstrap/**` to `package.json` `coverageThreshold`.
- Files: `src/bootstrap/seed-default-data.service.spec.ts`, `package.json`.

**Checkpoint 1:** `bun run test:cov`/`build`/`lint` clean. Manual: `bun run start:dev`, confirm 6 permissions + 4 roles exist.

### Phase 2: Shared auth primitives (`src/common/`)

**Task 2.1 — Types + JwtTokenService.** `src/common/types/authenticated-request.ts` (supersedes the inline type in `role.controller.ts`), `src/common/types/jwt-payload.ts` (`AccessTokenPayload { sub, roleSlug, level, permissions }`, `RefreshTokenPayload { sub }`), `src/common/token/jwt-token.service.ts` (wraps `@nestjs/jwt`, reads `JWT_ACCESS_SECRET`/`JWT_REFRESH_SECRET` via `ConfigService`), `src/common/token/token.module.ts` (`@Global()`).

**Task 2.2 — Guards + decorator.** `src/common/decorators/require-permissions.decorator.ts`, `src/common/guards/permissions.guard.ts` (read-implies-manager mapping), `src/common/guards/jwt-auth.guard.ts`, `src/common/guards/rate-limit.guard.ts` (in-memory token bucket, `RATE_LIMIT_FPS`/`RATE_LIMIT_BURST`).

**Task 2.3 — Tests + coverage gate for `src/common/`.**

**Checkpoint 2:** `bun run test:cov`/`build`/`lint` clean. Purely additive, inert primitives — nothing user-facing changed yet.

### Phase 3: Register + Verify-OTP + has-users

**Task 3.1 — Email port + stub.** `src/modules/auth/domain/ports/email-sender.port.ts` (`IEmailSender`), `src/modules/auth/infrastructure/email/console-email.sender.ts` (logs via Nest `Logger`).

**Task 3.2 — `hasAnyVerified()` on the users repository.** `IUserRepository.hasAnyVerified(): Promise<boolean>` (`prisma.user.count({ where: { verified: true } }) > 0`).
- Files: `user.repository.ts`, `prisma-user.repository.ts`, `prisma-user.repository.spec.ts`.

**Task 3.3 — Register + has-users.** `RegisterDto` (email, name, username, password, accountType — no `verified`/`roleId`), `RegisterService` (uniqueness checks, `bcryptjs.hash`, generate+hash 6-digit OTP, `roleId: null`, `verified: false`, calls `IEmailSender.sendOtpEmail`), `HasUsersService` (`count() === 0`). **Done** — see finding 3 for why this uses `bcryptjs` instead of the originally-planned `Bun.password`.

**Task 3.4 — Verify-OTP + resend-OTP.** `VerifyOtpService` (compare hashed OTP + expiry, on success resolve role via `hasAnyVerified()` → `super_admin`/`guest`, set `verified: true`, clear OTP fields), `ResendOtpService`.
- Dependencies: Task 3.2, 3.3, Phase 1.

**Task 3.5 — AuthController + AuthModule wiring (partial).** `/api/auth/{register,verify-otp,resend-otp,has-users}` (public, `RateLimitGuard` on register/verify-otp/resend-otp). Register in `AppModule`.

**Task 3.6 — Tests + coverage.**

**Checkpoint 3:** Manual: register → DB row `roleId: null`, `verified: false`; console logs OTP; verify-otp → `verified: true`, `roleId` = `super_admin` (first) or `guest` (subsequent).

### Phase 4: Login + Refresh + Logout

**Task 4.1 — LoginService.** `LoginDto` (email + password), `bcryptjs.compare`, `!verified` → `403` with explicit "email not verified" message (distinct from `401` invalid-credentials), else issue tokens via `JwtTokenService`.

**Task 4.2 — RefreshTokenService.** Verify refresh cookie, re-fetch user+role fresh from DB, issue new access token + rotate refresh token.

**Task 4.3 — Controller wiring for login/refresh/logout.** Cookie set/clear in controller (`httpOnly`, `secure: COOKIE_SECURE`, `sameSite: COOKIE_SAMESITE`, access ~15min/refresh ~7d). Logout inline, no service. `RateLimitGuard` on login.

**Task 4.4 — Tests + coverage.**

**Checkpoint 4:** Manual: login before verify → `403` distinct message; login after verify → cookies set; refresh → new access cookie; logout → cookies cleared.

### Phase 5: Forgot / Reset Password

**Task 5.1 — Services + DTOs.** `ForgotPasswordService` (random token, SHA-256 hash stored, 1h expiry, always returns success to avoid enumeration), `ResetPasswordService` (hash+compare, expiry check, `bcryptjs.hash` new password).

**Task 5.2 — Controller wiring + tests + coverage.** `RateLimitGuard` on both routes.

**Checkpoint 5:** Manual round-trip via console-logged token.

### Phase 6: Permission-slug authorization rollout

**Task 6.1 — Roles module.** Strip level-based `403` blocks from `CreateRoleService`/`UpdateRoleService`/`DeleteRoleService` (drop `callerRoleSlug` param). `role.controller.ts`: swap inline `AuthenticatedRequest` for shared one, add `@UseGuards(JwtAuthGuard, PermissionsGuard)` + `@RequirePermissions("role:manager")` on writes, `"role:read"` on `GET`.

**Task 6.2 — Permissions module.** Same guard/decorator pattern on `permission.controller.ts`.

**Task 6.3 — Users module: guard + level-hierarchy + super-admin rule.** Guards on `user.controller.ts`. In `UpdateUserService`/`DeleteUserService`: inject `ROLE_REPOSITORY`, compare caller's `level` vs target's (and new, if changing) role `level` — `403` if not strictly greater. If `dto.roleId` resolves to `super_admin`, require `req.user.roleSlug === "super_admin"`.

**Task 6.4 — Full regression pass.** `bun run test:cov`/`build`/`lint`.

**Checkpoint 6 (highest-risk):** Full manual end-to-end (register+verify first user → `super_admin` → login → roles readable; second user → `guest` → `403` everywhere; promote to `admin` → reads ok, writes `403`).

### Phase 7: Docs closeout (per `docs/rules/workflow.md`)

**Task 7.1** — Update `docs/documents/{roles,permissions,users}.md`; add `docs/documents/auth.md`; update `docs/ENTRYPOINT.md`.
**Task 7.2** — Fold `SPEC.md` into docs, then reset `SPEC.md` for the next cycle.

**Checkpoint 7 (final):** `bun run test:cov`/`build`/`lint` clean; every `SPEC.md` success-criteria checkbox verified true.

## Risks and Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Global `ValidationPipe` turned on for the first time changes behavior of every existing endpoint | Med | Called out in Task 0.1; checkpoint 0 catches regressions. |
| Schema migration ripples into 3 already-shipped entities' types | Med | Scoped as its own task (0.2) with its own checkpoint before new feature code lands. |
| Phase 6 changes authorization behavior of already-working endpoints | High | Done last, after login works, verified manually + full regression (6.4). |
| `bun run prisma:migrate` against a real/shared DB | Med | Explicit "ask first" step in Task 0.2. |
| JWT payload staleness (~15 min lag on permission changes) | Low | Accepted tradeoff of the stateless design; refresh cycle re-syncs faster. |

## Open Questions (confirm during build)

- Exact `level` values for the 4 default roles (assumed `guest=0, editor=0, admin=50, super_admin=100`).
- Login identifier — email only, or username too (assumed email-only).
- `isDefault: true` on all 4 seeded roles (assumed yes, for documentation even though authorization no longer reads it).

## Verification (end-to-end)

1. Boot log/DB shows 6 permissions + 4 roles seeded.
2. Register → verify-otp (OTP from console) → first user gets `super_admin`.
3. Login → cookies set → `GET /api/roles` succeeds.
4. Second account registers+verifies → gets `guest` → `403` on `/api/roles`, `/api/permissions`, `/api/users`.
5. `super_admin` promotes guest to `admin` → succeeds; `admin` reads succeed, writes `403`.
6. Forgot-password → reset-password round trip via console-logged token.
7. `bun run test:cov`, `bun run build`, `bun run lint` all clean.
