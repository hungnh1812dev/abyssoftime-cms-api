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
- [ ] `src/common/types/authenticated-request.ts`, `jwt-payload.ts`
- [ ] `src/common/token/jwt-token.service.ts` + `token.module.ts` (`@Global()`)
- [ ] `src/common/decorators/require-permissions.decorator.ts`
- [ ] `src/common/guards/permissions.guard.ts` (read-implies-manager)
- [ ] `src/common/guards/jwt-auth.guard.ts`
- [ ] `src/common/guards/rate-limit.guard.ts` (token bucket, `RATE_LIMIT_FPS`/`RATE_LIMIT_BURST`)
- [ ] Tests for all of the above + `coverageThreshold` entry for `src/common/**`
- [ ] **Checkpoint 2:** tests/build/lint clean (nothing wired into controllers yet)

## Phase 3 — Register + Verify-OTP + has-users
- [ ] `src/modules/auth/domain/ports/email-sender.port.ts` (`IEmailSender`)
- [ ] `src/modules/auth/infrastructure/email/console-email.sender.ts`
- [ ] `IUserRepository.hasAnyVerified()` + Prisma impl + spec
- [ ] `RegisterDto` + `RegisterService` (roleId: null, verified: false, hash+send OTP)
- [ ] `HasUsersService`
- [ ] `VerifyOtpDto`/`ResendOtpDto` + `VerifyOtpService` (assign role, verified: true) + `ResendOtpService`
- [ ] `auth.controller.ts` (register/verify-otp/resend-otp/has-users, public, rate-limited) + `auth.module.ts`
- [ ] Wire `AuthModule` into `AppModule`
- [ ] Tests + `coverageThreshold` entry for `src/modules/auth/application/**`
- [ ] **Checkpoint 3:** manual register → verify-otp → first user gets `super_admin`, subsequent get `guest`

## Phase 4 — Login + Refresh + Logout
- [ ] `LoginDto` + `LoginService` (verified check with distinct 403 message, issue tokens)
- [ ] `RefreshTokenService` (re-fetch fresh role from DB, rotate refresh token)
- [ ] Controller wiring: login/refresh/logout routes, cookie set/clear, `RateLimitGuard` on login
- [ ] Tests + coverage
- [ ] **Checkpoint 4:** manual login/refresh/logout cookie round trip

## Phase 5 — Forgot / Reset Password
- [ ] `ForgotPasswordDto`/`ResetPasswordDto` + `ForgotPasswordService` + `ResetPasswordService`
- [ ] Controller wiring + `RateLimitGuard`
- [ ] Tests + coverage
- [ ] **Checkpoint 5:** manual forgot→reset round trip via console-logged token

## Phase 6 — Permission-slug authorization rollout
- [ ] `roles`: strip level checks from create/update/delete services; add guards to `role.controller.ts`; swap in shared `AuthenticatedRequest`
- [ ] `permissions`: add guards to `permission.controller.ts`
- [ ] `users`: add guards to `user.controller.ts`; level-hierarchy check + super-admin-promotion rule in `update-user.service.ts`/`delete-user.service.ts` (inject `ROLE_REPOSITORY`)
- [ ] Update all affected `*.spec.ts` (role services lose level-check cases; user services gain hierarchy/promotion cases)
- [ ] **Checkpoint 6 (highest-risk):** full regression (`test:cov`/`build`/`lint`) + full manual end-to-end flow

## Phase 7 — Docs closeout
- [ ] Update `docs/documents/{roles,permissions,users}.md`
- [ ] Add `docs/documents/auth.md`
- [ ] Update `docs/ENTRYPOINT.md`
- [ ] Fold `SPEC.md` into docs, reset `SPEC.md` for next cycle
- [ ] **Checkpoint 7 (final):** all `SPEC.md` success criteria verified true
