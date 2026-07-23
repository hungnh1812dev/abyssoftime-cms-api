# Todo — Default Seeding + Auth + Permission-Slug Authorization

See `tasks/plan.md` for full context and rationale.

## Phase 0 — Foundation
- [x] Add deps: `@nestjs/jwt`, `cookie-parser`, `@types/cookie-parser`
- [x] `src/main.ts` — global `ValidationPipe` + `cookieParser()` middleware
- [x] Schema: `Role.updatedBy`/`Permission.updatedBy` → nullable, `User.roleId` → nullable, add `otpCodeHash`/`otpExpiresAt`/`resetTokenHash`/`resetTokenExpiresAt` to `User` (`prisma/postgresql/schema.prisma` only)
- [x] Update `PermissionEntity`/`RoleEntity`/`UserEntity` + repository interfaces + Prisma repo `toEntity()` mappers for the nullable-field widening
- [x] `bun run prisma:generate`
- [x] Ask before `bun run prisma:migrate` against local dev DB (user will run it manually — no `datasource.url` wired for the Prisma CLI yet)
- [x] **Checkpoint 0:** `bun run build`/`lint`/`test:cov` clean, zero regressions

## Phase 1 — Boot-time default data seeding
- [x] `src/bootstrap/seed-default-data.service.ts` — upsert-if-missing 6 permissions + 4 roles
- [x] `src/bootstrap/seed.module.ts` — imports `PermissionModule`+`RoleModule`
- [x] Wire `SeedModule` into `AppModule`
- [x] `seed-default-data.service.spec.ts` (nothing/partial/full-exists branches)
- [x] `package.json` — `coverageThreshold` entry for `src/bootstrap/**`
- [ ] **Checkpoint 1:** tests/build/lint clean; manual boot shows 6 permissions + 4 roles (blocked on user's local env — see note below)

## Phase 2 — Shared auth primitives (`src/common/`)
- [x] `src/common/types/authenticated-request.ts`, `jwt-payload.ts`
- [x] `src/common/token/jwt-token.service.ts` + `token.module.ts` (`@Global()`, wired into `AppModule`)
- [x] `src/common/decorators/require-permissions.decorator.ts`
- [x] `src/common/guards/permissions.guard.ts` (read-implies-manager)
- [x] `src/common/guards/jwt-auth.guard.ts`
- [x] `src/common/guards/rate-limit.guard.ts` (token bucket, `RATE_LIMIT_FPS`/`RATE_LIMIT_BURST`)
- [x] Tests for all of the above + `coverageThreshold` entry for `src/common/decorators/**` and `src/common/guards/**` (`src/common/token/jwt-token.service.ts` left ungated — same untestable ts-jest decorator-metadata branch quirk as the pre-existing `prisma.service.ts`)
- [x] **Checkpoint 2:** tests/build/lint clean (nothing wired into controllers yet)

## Phase 3 — Register + Verify-OTP + has-users
- [x] `src/modules/auth/domain/ports/email-sender.port.ts` (`IEmailSender`)
- [x] `src/modules/auth/infrastructure/email/console-email.sender.ts`
- [x] `IUserRepository.hasAnyVerified()` + Prisma impl + spec
- [x] `RegisterDto` + `RegisterService` (roleId: null, verified: false, hash+send OTP) — uses `bcryptjs`, not `Bun.password` (see plan.md finding 3)
- [x] `HasUsersService`
- [x] `VerifyOtpDto`/`ResendOtpDto` + `VerifyOtpService` (assign role, verified: true) + `ResendOtpService`
- [x] `auth.controller.ts` (register/verify-otp/resend-otp/has-users, public, rate-limited) + `auth.module.ts`
- [x] Wire `AuthModule` into `AppModule`
- [x] Tests + `coverageThreshold` entry for `src/modules/auth/application/**`
- [ ] **Checkpoint 3:** manual register → verify-otp → first user gets `super_admin`, subsequent get `guest`

## Phase 4 — Login + Refresh + Logout
- [x] `LoginDto` + `LoginService` (verified check with distinct 403 message, issue tokens)
- [x] `RefreshTokenService` (re-fetch fresh role from DB, rotate refresh token)
- [x] Controller wiring: login/refresh/logout routes, cookie set/clear, `RateLimitGuard` on login
- [x] Tests + coverage (already covered by 4.1–4.3's tests; `auth/application/services` branch coverage 92.85%, well above the 80% gate — the two remaining "uncovered" lines are constructor-parameter decorator-metadata artifacts, same known ts-jest quirk as `jwt-token.service.ts`)
- [ ] **Checkpoint 4:** manual login/refresh/logout cookie round trip

## Phase 5 — Forgot / Reset Password
- [x] `ForgotPasswordDto`/`ResetPasswordDto` + `ForgotPasswordService` + `ResetPasswordService`
- [x] Controller wiring + `RateLimitGuard`
- [x] Tests + coverage (already covered by 5.1–5.2's tests; `ForgotPasswordService`/`ResetPasswordService` both 100% branches, `auth/application/services` group at 94%, well above the 80% gate)
- [ ] **Checkpoint 5:** manual forgot→reset round trip via console-logged token

## Phase 6 — Permission-slug authorization rollout
- [x] `roles`: strip level checks from create/update/delete services; add guards to `role.controller.ts`; swap in shared `AuthenticatedRequest`
- [x] `permissions`: add guards to `permission.controller.ts`
- [x] `users`: add guards to `user.controller.ts`; level-hierarchy check + super-admin-promotion rule in `update-user.service.ts`/`delete-user.service.ts` (inject `ROLE_REPOSITORY`) — resolved a spec ambiguity: the super_admin-slug check replaces (not stacks with) the generic level check when promoting to super_admin, since level 100 is both super_admin's level and the DTO-enforced ceiling, so "caller.level > 100" could never be satisfied otherwise (confirmed with user)
- [x] Update all affected `*.spec.ts` (role services lose level-check cases; user services gain hierarchy/promotion cases)
- [ ] **Checkpoint 6 (highest-risk):** full regression (`test:cov`/`build`/`lint`) + full manual end-to-end flow

## Phase 7 — Docs closeout
- [x] Update `docs/documents/{roles,permissions,users}.md`
- [x] Add `docs/documents/auth.md`
- [x] Update `docs/ENTRYPOINT.md`
- [x] Fold `SPEC.md` into docs, reset `SPEC.md` for next cycle
- [ ] **Checkpoint 7 (final):** all `SPEC.md` success criteria verified true
