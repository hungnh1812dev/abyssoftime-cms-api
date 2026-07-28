# Plan: Integrate `@nestjs/passport` as the auth-strategy framework (`[CAREFUL]`)

See `SPEC.md` for the active spec and `docs/documents/auth-passport-techstack.md` for the four decision tables. This plan installs `@nestjs/passport` and converts **exactly two** hand-rolled auth mechanisms — the custom `JwtAuthGuard` and `LoginService`'s inline credential check — into Passport strategies (`JwtStrategy` via `passport-jwt`, `LocalStrategy` via `passport-local`) registered under one `PassportModule` in `AuthModule`. Every external contract (cookies, `req.user`, 401/403 messages and status codes) stays byte-for-byte identical; downstream `@UseGuards(JwtAuthGuard, ...)` / `ACCESS_TOKEN_COOKIE` call sites need zero edits. OAuth itself is explicitly out of scope — this is groundwork only.

## Context

Auth today is two independent bespoke mechanisms: `JwtAuthGuard` (`src/common/guards/jwt-auth.guard.ts`) hand-parses the cookie and wraps `JwtTokenService.verifyAccessToken` in a `try/catch`; `LoginService` inlines all credential checking (dummy-hash timing mitigation, verified/role checks, message strings). Adding an OAuth provider on top of that would mean a *third* bespoke mechanism and a later migration to unify them. This cycle lays the Passport framework down now so a future `GoogleStrategy`/`GitHubStrategy` slots in beside `JwtStrategy`/`LocalStrategy` with no further migration. `TokenModule` stays completely untouched; `RefreshTokenService` and the refresh/logout routes stay manual/non-Passport by the user's explicit scope choice.

Slicing note: this is a single cohesive infrastructure conversion, not several independent user-facing features (same nature as the email-sender cycle), so tasks are ordered by dependency — the JWT half first (it is testable/verifiable in isolation, and its module wiring is a clean still-green intermediate state), then the login/local half (which changes `LoginService`, `AuthController.login`, and three more spec files together because they move as one unit), then docs, review, and manual verification — rather than by vertical user-story slices. Package install folds into Phase 1 (both strategies depend on it and Phase 1 is the first thing that imports from the new packages), rather than being its own thin phase.

## Key files

- `src/common/guards/jwt-auth.guard.ts` — currently `implements CanActivate` with hand-rolled cookie read + `try/catch`; keeps its `JwtAuthGuard` class name **and** the `ACCESS_TOKEN_COOKIE = "access_token"` export (export location must not move — `auth.controller.ts` and every guarded controller import it from here)
- `src/common/guards/jwt-auth.guard.spec.ts` — rewrite to test `handleRequest` in isolation
- `src/common/strategies/` — **new directory**: `jwt.strategy.ts` (+ spec), `local.strategy.ts` (+ spec, exports `ValidatedLoginUser`)
- `src/common/types/jwt-payload.ts` — `AccessTokenPayload` (JwtStrategy's `validate` return type); `src/common/types/authenticated-request.ts` — `AuthenticatedRequest` (unchanged; `ValidatedLoginUser` is a separate login-route-local shape, NOT this)
- `src/modules/auth/application/services/login.service.ts` — shrinks to synchronous token-signing over `ValidatedLoginUser`; drops `USER_REPOSITORY`/`ROLE_REPOSITORY`/`LoginDto`/`bcrypt`; its spec rewritten to token-signing only
- `src/modules/auth/presentation/auth.controller.ts` — **only** the `login` route changes: `@UseGuards(RateLimitGuard, AuthGuard("local"))`, reads `req.user` via `@Req()`, keeps `@Body() dto: LoginDto` for Swagger introspection; spec updated for that one route
- `src/modules/auth/auth.module.ts` — adds `PassportModule.register({ defaultStrategy: "jwt" })` to `imports` and `JwtStrategy` + `LocalStrategy` to `providers`; `AuthModule` already imports `UserModule` + `RoleModule` (the exact repos `LocalStrategy` injects), so no new wiring beyond that
- `src/modules/auth/auth.module.spec.ts` — asserts `imports` via `toHaveLength(3)` + positional `imports[0]/[1]/[2]` checks, and `providers` via an exact `toEqual([...])` array (`Reflect.getMetadata`). **Both assertions must be updated** in lockstep with the wiring: imports length 3→4 with a new positional check for the `PassportModule` dynamic-module registration, and the providers array gains `JwtStrategy` (Phase 1) then `LocalStrategy` (Phase 2)
- `src/common/token/**` (`TokenModule`, `JwtTokenService`) — **do not touch** (`@Global()`, many unrelated consumers; still used by `RefreshTokenService` and `LoginService`'s signing tail)
- `docs/documents/auth.md` — updated in the docs phase to reflect the Passport-based guard/login + two strategies + module wiring
- `eslint.config.mjs` — check its `argsIgnorePattern`/`no-unused-vars` config to decide whether the now-unread `@Body() dto` needs a `_dto` rename (see Phase 2)

## Confirmed decisions (from the Spec phase, restated)

1. New deps: `@nestjs/passport`, `passport`, `passport-jwt`, `passport-local` (runtime) + `@types/passport-jwt`, `@types/passport-local` (dev). Install via `bun add` / `bun add -d`, no manual version pinning (matches the email-sender cycle's `bun add nodemailer` precedent). Installing anything beyond these six is an "Ask first".
2. `JwtStrategy` uses a custom `jwtFromRequest` cookie extractor (`passport-jwt` ships no cookie extractor — this is its documented idiomatic approach for cookie tokens) reading `ACCESS_TOKEN_COOKIE`; `ignoreExpiration: false`; `secretOrKey` from `ConfigService`; `validate` is a pure pass-through (no DB hit, preserving today's behavior).
3. `JwtAuthGuard` becomes `extends AuthGuard("jwt")` with a `handleRequest` override that preserves today's two exact 401 messages. The `"Missing access token"` branch keys off `passport-jwt`'s internal `info.message === "No auth token"` string — a **known, accepted coupling** (confirmed with the user; documented in the techstack doc as the place to re-check on a `passport-jwt` upgrade), not a gap.
4. `LocalStrategy` (`usernameField: "email"`) absorbs `LoginService`'s credential logic **verbatim** — dummy-hash timing mitigation, message strings, status codes, and ordering all preserved — and returns `{ user, role }`. `ValidatedLoginUser` is exported from `local.strategy.ts` (colocated with the `validate()` that produces it).
5. Login conversion (`passport-local`) was the user's explicit call among three scoped options (JWT-only / JWT+local / scaffold-only) — chosen for one uniform Passport model now, accepting it is more a consistency investment than an OAuth technical prerequisite.
6. Strategies are registered in `AuthModule`, not the `@Global() TokenModule` — their DI dependencies already live in `AuthModule`, and `TokenModule` stays untouched. Placement is a DI-convenience question, not a functional-scope one (Passport's process-wide registry means `AuthGuard(name)` resolves regardless).
7. No new env vars; no change to DTOs, `AuthenticatedRequest`, `IEmailSender`, or any non-login route.
8. `[CAREFUL]` tag: this Build (plan) step and the later five-axis Review step run on **Opus**; Build (execute), Update docs, and Clean up run on Sonnet.

## Tasks

### Phase 1 — Install + JWT half (`JwtStrategy` + `JwtAuthGuard` conversion)
- [x] `bun add @nestjs/passport passport passport-jwt passport-local && bun add -d @types/passport-jwt @types/passport-local`
- [x] `src/common/strategies/jwt.strategy.ts` — `class JwtStrategy extends PassportStrategy(Strategy, "jwt")`; custom cookie `jwtFromRequest` reading `ACCESS_TOKEN_COOKIE`, `ignoreExpiration: false`, `secretOrKey` from `ConfigService<EnvironmentVariables, true>`; pass-through `validate(payload): AccessTokenPayload`
- [x] `src/common/strategies/jwt.strategy.spec.ts` — unit-test the cookie extractor (returns the token when the cookie is present; returns `null` when `req.cookies` is absent/empty) and that `validate(payload)` returns the payload unchanged
- [x] `src/common/guards/jwt-auth.guard.ts` — rewrite to `class JwtAuthGuard extends AuthGuard("jwt")` with the `handleRequest` override (`"No auth token"` info → `"Missing access token"`; truthy `err` / verification-error info / `!user` → `"Invalid or expired access token"`; valid user returned unchanged); **keep the `ACCESS_TOKEN_COOKIE` export in this same file**
- [x] `src/common/guards/jwt-auth.guard.spec.ts` — rewrite to call `handleRequest` directly with synthetic `err`/`user`/`info` args covering all three branches; do NOT drive the inherited `canActivate` chain
- [x] `src/modules/auth/auth.module.ts` — add `PassportModule.register({ defaultStrategy: "jwt" })` to `imports` and `JwtStrategy` to `providers` (partial wiring — `LocalStrategy` lands in Phase 2)
- [x] `src/modules/auth/auth.module.spec.ts` — update the imports assertion (length 3→4 + a positional check for the `PassportModule` dynamic module) and add `JwtStrategy` to the exact `providers` array
- [x] **Checkpoint 1:** `bun run build`, `bunx tsc --noEmit`, `bun run lint`, `bun run test:cov` all green. This is a complete still-green intermediate state — JWT-guarded routes now flow through `JwtStrategy`; `LoginService`/`AuthController.login` are still the old flow and still pass. Commit here (automatically verifiable checkpoint → commit once green).

### Phase 2 — Login half (`LocalStrategy` + shrunk `LoginService` + `AuthController.login` + remaining wiring)
- [ ] `src/common/strategies/local.strategy.ts` — `class LocalStrategy extends PassportStrategy(Strategy)` with `super({ usernameField: "email" })`; injects `USER_REPOSITORY` + `ROLE_REPOSITORY` (same tokens `LoginService` uses today); `validate(email, password)` moves the credential logic **verbatim** (not-found → `bcrypt.compare` against `DUMMY_PASSWORD_HASH` then 401; wrong password → same 401; `!verified` → 403; `!roleId` → same 401; success → resolve role → return `{ user, role }`); **export `interface ValidatedLoginUser { user: UserEntity; role: RoleEntity }`**
- [ ] `src/common/strategies/local.strategy.spec.ts` — carries all five credential-checking cases moved out of `login.service.spec.ts` (not-found calls `bcrypt.compare` on `DUMMY_PASSWORD_HASH` + 401; wrong password 401; unverified 403; no `roleId` 401; success resolves role via `IRoleRepository.findById` and returns `{ user, role }`)
- [ ] `src/modules/auth/application/services/login.service.ts` — shrink to `execute({ user, role }: ValidatedLoginUser): LoginResult` (synchronous, token-signing only); remove `USER_REPOSITORY`/`ROLE_REPOSITORY`/`LoginDto`/`bcrypt`/`DUMMY_PASSWORD_HASH` and the async/repository logic
- [ ] `src/modules/auth/application/services/login.service.spec.ts` — rewrite to token-signing only: given `{ user, role }`, assert `signAccessToken`/`signRefreshToken` are called with the right payloads and `{ accessToken, refreshToken }` returned; no repository mocks
- [ ] `src/modules/auth/presentation/auth.controller.ts` — `login` route only: `@UseGuards(RateLimitGuard, AuthGuard("local"))` (import `AuthGuard` from `@nestjs/passport`), add `@Req() req` typed so `req.user` is `ValidatedLoginUser`, call `this.loginService.execute(req.user)`, set cookies exactly as today. Keep `@Body() dto: LoginDto` for Swagger — **first check `eslint.config.mjs`'s `argsIgnorePattern`/`no-unused-vars` config**: rely on it if it already ignores unused params, else rename to `_dto` (do not guess — read the config)
- [ ] `src/modules/auth/presentation/auth.controller.spec.ts` — update the login-route test to the new `req.user` → `loginService.execute(req.user)` flow; assert cookies are still set with the correct `httpOnly`/`secure`/`sameSite`/`maxAge`
- [ ] `src/modules/auth/auth.module.ts` — add `LocalStrategy` to `providers`
- [ ] `src/modules/auth/auth.module.spec.ts` — add `LocalStrategy` to the exact `providers` array
- [ ] **Checkpoint 2:** `bun run build`, `bunx tsc --noEmit`, `bun run lint`, `bun run test:cov` all green — **commit here.** This is the last code phase; its checkpoint is automatically verifiable, so per the workflow "checkpoint commit timing" rule this commit is NOT held open waiting on Phase 5's manual DB walkthrough.

### Phase 3 — Docs (`auth.md`)
- [ ] `docs/documents/auth.md` — update the guard/login/module writeup: `JwtAuthGuard` now extends `AuthGuard("jwt")`; the two new strategies under `src/common/strategies/`; `LoginService` shrunk to token-signing; `AuthController.login` on `AuthGuard("local")`; `PassportModule` + strategy providers in `AuthModule`; the Tests section (new strategy specs, rewritten guard/login-service specs). Cross-link `auth-passport-techstack.md`
- [ ] **Checkpoint 3:** doc read-through — no section still describes the old hand-rolled guard or the old `LoginService` credential flow — commit.

### Phase 4 — Five-axis code review (Opus) + fixes + `SPEC.md` trim + close-out
- [ ] **Run the review on Opus** — `[CAREFUL]` mandates Opus for the Review phase, not just planning. Reminder for whoever executes Build: switch to / invoke Opus for this step (e.g. `agent-skills:code-reviewer`), don't run it on Sonnet
- [ ] Five-axis review (correctness / readability / architecture / security / performance) over the full cycle diff — pay special attention to: the `handleRequest` message parity, the `DUMMY_PASSWORD_HASH` timing mitigation surviving the move to `LocalStrategy` verbatim, no `req.user`-shape regression on JWT-guarded routes, and `TokenModule` staying untouched
- [ ] Fix any Important/correctness findings (re-verify `bun run build` / `bun run test:cov` / `bun run lint` after fixes); record findings + resolutions inline at this checkpoint
- [ ] `SPEC.md` — trim the completed spec back to a one-line pointer at `docs/documents/auth.md` (+ `auth-passport-techstack.md`), per the "Root docs" rule
- [ ] **Checkpoint 4 (final):** all automated checks green after any review fixes; `SPEC.md` reduced to the pointer — commit.

### Phase 5 — Manual verification (non-blocking for the Phase 2 commit; user-performed)
- [ ] User runs `bun run start:dev` against a real DB and walks through: login **success** (valid verified user → cookies set), login **wrong-password** (→ 401, same message), login **unverified-user** (→ 403 "Email not verified, please check your inbox"), and one JWT-guarded route (e.g. `GET /api/v1/roles`) **with** a valid `access_token` cookie (→ 200) and **without** one (→ 401 "Missing access token")
- [ ] Tracked as outstanding until the user confirms — same pattern as the email-sender cycle's manual-verification phase; not required for the code/test commits but required before the feature is declared fully done

## Verification (end-to-end)

1. `bun run build && bunx tsc --noEmit && bun run lint && bun run test:cov` — all green, zero new lint/type errors (use `bun run lint`, never `bunx eslint`).
2. Exported names stable: `JwtAuthGuard` (class) + `ACCESS_TOKEN_COOKIE` (constant, still in `jwt-auth.guard.ts`); every downstream `@UseGuards(JwtAuthGuard, ...)` / `ACCESS_TOKEN_COOKIE` import across users/roles/permissions/media/document/content-type/auth-logout compiles with zero call-site edits.
3. Login and JWT-guard external contracts unchanged: same cookies, same `req.user` shape on guarded routes, same 401/403 messages and status codes.
4. `TokenModule` diff is empty; `RefreshTokenService` and the refresh/logout routes are untouched.
5. Manual (Phase 5, user-performed): login success/wrong-password/unverified + one JWT-guarded route confirmed against a real DB.
