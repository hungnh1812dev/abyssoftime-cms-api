# Auth Module

`src/modules/auth/**` — clean-architecture module implementing the end-user-facing auth lifecycle: register → OTP-verify → login → refresh/logout, plus forgot/reset-password. Fully wired: registered in `AppModule`, all routes live. Shares the `User` entity/repository with the `users` module (see [users.md](./users.md)) rather than owning its own user model — this module only adds behavior (hashing, tokens, OTP/reset-token lifecycle) on top of it.

## Shared primitives it depends on (`src/common/`)

Deliberately kept outside `auth/` so `users`/`roles`/`permissions` don't have to import the `auth` module directly (preserves "each module independent"):

- `common/token/jwt-token.service.ts` — `JwtTokenService` wraps `@nestjs/jwt`: `signAccessToken`/`signRefreshToken` (15m / 7d expiry, separate `JWT_ACCESS_SECRET`/`JWT_REFRESH_SECRET`), `verifyAccessToken`/`verifyRefreshToken`. `common/token/token.module.ts` (`TokenModule`) is `@Global()`, so `JwtTokenService` is injectable anywhere without an explicit import.
- `common/guards/jwt-auth.guard.ts` — `JwtAuthGuard` reads the `access_token` httpOnly cookie (`ACCESS_TOKEN_COOKIE = "access_token"`, exported from this file), verifies it via `JwtTokenService`, and populates `req.user` with the decoded `AccessTokenPayload`. Throws `401` if the cookie is missing or invalid/expired.
- `common/guards/permissions.guard.ts` — `PermissionsGuard` reads `@RequirePermissions(...)` metadata and checks it against `req.user.permissions` (read-implies-manager). Used by `roles`/`permissions`/`users`, not by `auth` itself (auth's own routes are either public or only need `JwtAuthGuard`, never `PermissionsGuard`).
- `common/guards/rate-limit.guard.ts` — `RateLimitGuard`, an in-memory per-IP+per-route token bucket (`RATE_LIMIT_FPS`/`RATE_LIMIT_BURST` env vars). Applied to every auth route that's exposed to unauthenticated callers and could be abused (register/verify-otp/resend-otp/login/forgot-password/reset-password) — not to `refresh`/`logout`/`has-users`.
- `common/types/authenticated-request.ts` / `jwt-payload.ts` — `AuthenticatedRequest = Request & { user: AccessTokenPayload }`, `AccessTokenPayload { sub, roleSlug, level, permissions }`, `RefreshTokenPayload { sub }`. The access token is intentionally self-contained (embeds `roleSlug`/`level`/`permissions` at sign time) so `JwtAuthGuard` never hits the database — a role's permission changes take up to ~15 minutes (the access-token TTL) to apply to an already-logged-in user of that role.

## Domain port

`domain/ports/email-sender.port.ts` — `IEmailSender { sendOtpEmail({ email, otp }); sendPasswordResetEmail({ email, resetToken }) }`, DI token `EMAIL_SENDER`. `infrastructure/email/console-email.sender.ts` (`ConsoleEmailSender`) is the only implementation today — it just logs both codes via the Nest `Logger` (`this.logger.log(...)`) instead of sending real email. Swapping in a real provider later is a one-line change: replace `{ provide: EMAIL_SENDER, useClass: ConsoleEmailSender }` in `auth.module.ts`.

## DTOs

All in `application/dto/`, all `class-validator`-decorated (the global `ValidationPipe` registered in `src/bootstrap/configure-app.ts` — `{ whitelist: true, transform: true }`, wired up from `src/main.ts` — is what makes these decorators actually enforce anything):

- `register.dto.ts` — `email` (`@IsEmail`), `name`/`username`/`password` (`@IsString @IsNotEmpty`), `accountType` (`@IsBoolean`). No `verified`/`roleId` — those are never client-settable.
- `login.dto.ts` — `email` (`@IsEmail`), `password` (`@IsString @IsNotEmpty`).
- `verify-otp.dto.ts` — `email` (`@IsEmail`), `otp` (`@Matches(/^\d{6}$/)`).
- `resend-otp.dto.ts` — `email` (`@IsEmail`).
- `forgot-password.dto.ts` — `email` (`@IsEmail`).
- `reset-password.dto.ts` — `token`/`newPassword` (`@IsString @IsNotEmpty`).

## Services & business rules

Every service injects `USER_REPOSITORY` (from `users`) and, where noted, `ROLE_REPOSITORY` (from `roles`) or `EMAIL_SENDER`/`JwtTokenService`. All password/OTP hashing uses `bcryptjs` (see [Known gaps](#known-gaps) for why — **not** `Bun.password`, despite this project running on Bun).

- **`RegisterService`** — `409` if `email` or `username` already in use. Otherwise: `bcrypt.hash`es the password, generates a 6-digit numeric OTP (`node:crypto`'s `randomInt`), `bcrypt.hash`es the OTP too, creates the user with `roleId: null`, `verified: false`, `otpCodeHash`/`otpExpiresAt` (10-minute TTL), then calls `IEmailSender.sendOtpEmail` with the **plaintext** OTP (the hash is what's persisted).
- **`VerifyOtpService`** — looks up by email (`404` if not found), `409` if already verified, `400` if there's no pending OTP or it's expired, `400` if the OTP doesn't `bcrypt.compare` match. On success: calls `IUserRepository.hasAnyVerified()` **before** marking this user verified — if `false`, this is the first user ever to complete verification and gets `super_admin`; otherwise `guest` (role resolved via `IRoleRepository.findBySlug`). Sets `verified: true`, the resolved `roleId`, and clears `otpCodeHash`/`otpExpiresAt` (single-use). "First user" is evaluated at **verification** time, not registration time — whoever *verifies* first gets `super_admin`, not necessarily whoever registered first.
- **`ResendOtpService`** — `404` if not found, `409` if already verified; otherwise generates and persists a fresh hashed OTP (same 10-minute TTL) and re-emails it.
- **`HasUsersService`** — `(await IUserRepository.count()) > 0`. Backs the public `GET /api/auth/has-users` check (e.g. so a client can show a "set up the first admin account" flow).
- **`LoginService`** — `401` if the email doesn't resolve or the password doesn't `bcrypt.compare` (same generic message either way, to avoid distinguishing "no such account" from "wrong password"). **Then** `403` if `!user.verified`, with a distinct, explicit message ("Email not verified...") — deliberately checked *after* credentials so an unverified user still gets routed to "verify your email" instead of a generic auth failure. Resolves the user's role via `IRoleRepository.findById(user.roleId)` and signs an access token (embedding `roleSlug`/`level`/`permissions`) + refresh token (`{ sub: documentId }` only) via `JwtTokenService`.
- **`RefreshTokenService`** — verifies the refresh cookie via `JwtTokenService.verifyRefreshToken` (any JWT error → `401`), re-fetches the user **and role fresh from the database** (not from stale token claims — this is what makes a role/permission change take effect on refresh instead of waiting out the full access-token TTL), then issues a new access token and **rotates** the refresh token.
- **`ForgotPasswordService`** — looks up by email; if not found, **resolves successfully anyway** (no error, no email sent) to avoid leaking which emails are registered. If found: generates a random 32-byte token (`node:crypto`'s `randomBytes(32).toString("hex")`), stores its **SHA-256** hash (not bcrypt — it's already a high-entropy random token, not a low-entropy secret that needs slow hashing) with a 1-hour expiry, and emails the **plaintext** token via `IEmailSender.sendPasswordResetEmail`.
- **`ResetPasswordService`** — SHA-256-hashes the incoming `token` and looks up by `IUserRepository.findByResetTokenHash`; `400` ("Invalid or expired reset token") if not found or if `resetTokenExpiresAt` is missing/past. Otherwise `bcrypt.hash`es `newPassword` and clears `resetTokenHash`/`resetTokenExpiresAt` (single-use).

## Endpoints

`presentation/auth.controller.ts`, `@Controller("/api/auth")`. `login`/`refresh` set `access_token`/`refresh_token` as httpOnly cookies (`secure`/`sameSite` from `COOKIE_SECURE`/`COOKIE_SAMESITE` env vars, ~15min/~7d `maxAge`); `logout` clears both. No route ever returns a password hash, OTP hash, or reset-token hash in its response body — every response is just `{ message }` (or `{ hasUsers }`).

| Method | Path                        | Service                | Guard                          | Notes |
| ------ | --------------------------- | ----------------------- | ------------------------------- | ----- |
| `POST` | `/api/auth/register`        | `RegisterService`       | `RateLimitGuard`                 | Public |
| `POST` | `/api/auth/verify-otp`      | `VerifyOtpService`       | `RateLimitGuard`                 | Public |
| `POST` | `/api/auth/resend-otp`      | `ResendOtpService`       | `RateLimitGuard`                 | Public |
| `GET`  | `/api/auth/has-users`       | `HasUsersService`        | none                              | Public |
| `POST` | `/api/auth/login`           | `LoginService`           | `RateLimitGuard`                 | Public; sets both cookies |
| `POST` | `/api/auth/refresh`         | `RefreshTokenService`    | none (reads the refresh cookie manually) | Public; rotates both cookies |
| `POST` | `/api/auth/logout`          | — (inline, no service)  | none                              | Public; clears both cookies |
| `POST` | `/api/auth/forgot-password` | `ForgotPasswordService`  | `RateLimitGuard`                 | Public |
| `POST` | `/api/auth/reset-password`  | `ResetPasswordService`   | `RateLimitGuard`                 | Public |

Every route here is public (unauthenticated) by design — this is the module whose job is to *establish* identity. Everything under `/api/users`, `/api/roles`, `/api/permissions` is what actually requires `JwtAuthGuard` + `PermissionsGuard` (see [users.md](./users.md), [roles.md](./roles.md), [permissions.md](./permissions.md)).

## Module wiring

`auth.module.ts` imports `UserModule` + `RoleModule`, registers the controller and all seven services, and binds `EMAIL_SENDER → ConsoleEmailSender`. Imported into `src/app.module.ts` alongside the other feature modules and `SeedModule` (the boot-time seeder that inserts the 6 default permissions + 4 default roles — `super_admin`/`admin`/`editor`/`guest` at levels 100/50/0/0 respectively — that `VerifyOtpService`/`LoginService` resolve against; see `src/bootstrap/seed-default-data.service.ts`).

## Known gaps / deliberate scope decisions

- **`bcryptjs`, not `Bun.password`, despite this project running on Bun.** The original plan used `Bun.password.hash`/`.verify` (Bun's built-in hashing API, no new dependency). That broke immediately: this project's test suite runs via `bun run test` → Jest, and Jest's `testEnvironment: "node"` executes every test file under a real Node.js process regardless of which binary launched the Jest CLI — `Bun` is `undefined` inside test files. Switched to `bcryptjs` (pure-JS, portable across both runtimes) for all password/OTP hashing; see `tasks/plan.md` finding 3 for the full account.
- **No server-side token revocation.** Access/refresh JWTs are never persisted; a leaked refresh token remains valid until it naturally expires (7 days) or is rotated out by a subsequent legitimate refresh. Accepted tradeoff for a stateless design, not a gap to fix later.
- **No e2e tests** for the full register→verify→login→refresh round trip (consistent with how `users`/`roles`/`permissions` were scoped — pure unit tests with mocked repositories/ports only). `src/bootstrap/configure-app.spec.ts` does exercise one real HTTP round trip (against `/api/permissions`, with the auth guards overridden), but only to prove the global `ValidationPipe`/`cookie-parser` wiring, not this module's own routes.
- **Manual end-to-end verification is still outstanding** as of this writing — every unit-testable piece is covered (`bun run test:cov`/`build`/`lint` all clean), but nobody has yet run `bun run start:dev` against a real database and walked through register → verify → login → refresh → logout, or the two-user `super_admin`-then-`guest` role-assignment scenario, by hand.

## Tests

Unit tests (Jest, mocked `IUserRepository`/`IRoleRepository`/`IEmailSender`/`JwtTokenService`, ≥80% branch coverage gated at `src/modules/auth/application/**` in `package.json`) live next to each source file: `register.service.spec.ts`, `verify-otp.service.spec.ts`, `resend-otp.service.spec.ts`, `has-users.service.spec.ts`, `login.service.spec.ts`, `refresh-token.service.spec.ts`, `forgot-password.service.spec.ts`, `reset-password.service.spec.ts`, `console-email.sender.spec.ts`, `auth.controller.spec.ts` (delegation only, plus asserting cookies are set/cleared with the right `httpOnly`/`secure`/`sameSite` options — provides a mocked `ConfigService` so the testing module can instantiate `RateLimitGuard`, referenced via `@UseGuards` on most routes; `auth`'s own routes never use `JwtAuthGuard`/`PermissionsGuard`, since they're the ones establishing identity in the first place).

## Verified state (2026-07-23)

`bun run build`, `bunx tsc --noEmit`, `bunx eslint`, and `bun run test:cov` all pass with zero errors for this module. Branch coverage on `src/modules/auth/application/**` is ≥90% across every file (the two services below 100% — `login.service.ts` at 91.66%, `refresh-token.service.ts` at 87.5% — are both just an Istanbul artifact on the constructor's parameter-property line, the same known ts-jest quirk noted for `src/common/token/jwt-token.service.ts`).
