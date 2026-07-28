# Spec

## Active spec: `[CAREFUL]` Integrate `@nestjs/passport` as the auth-strategy framework

Per `docs/rules/workflow.md`'s `[CAREFUL]` rule: use Opus for the **Spec**, **Build (plan)** and **Review** phases; Sonnet for Build (execute), Update spec, Update docs, Clean up.

### Objective

Today this app has **no Passport-based strategy abstraction at all** — auth is two independent, hand-rolled mechanisms: a custom `JwtAuthGuard` (`src/common/guards/jwt-auth.guard.ts`, reads the cookie + calls `JwtTokenService.verifyAccessToken` inside a `try/catch`) and a `LoginService` that inlines all credential checking. Adding an OAuth provider later (Google/GitHub/...) on top of that would mean a *second* bespoke mechanism and then an architectural migration to unify them.

This cycle installs `@nestjs/passport` as the strategy framework and converts **exactly those two** mechanisms to Passport strategies (`JwtStrategy` via `passport-jwt`, `LocalStrategy` via `passport-local`), registered under one `PassportModule`, so a future OAuth strategy can be added *alongside* them with no further migration. **OAuth itself is explicitly out of scope** — this cycle is groundwork only.

**Success looks like:**

- Every JWT-guarded route (users/roles/permissions/media/document/content-type controllers, plus auth's own logout) behaves **identically from an external/API-contract point of view** — same cookie, same `req.user` shape, same 401 messages. Call sites (`@UseGuards(JwtAuthGuard, ...)`, `import { ACCESS_TOKEN_COOKIE }`) need **zero changes**.
- Login behaves **identically from an external point of view** — same request body, same 401/403 messages and status codes, same cookies set.
- `PassportModule` + `JwtStrategy` + `LocalStrategy` exist and are exercised by real HTTP requests, ready for a future OAuth strategy to slot in beside them.

### Tech Stack

- Framework: `@nestjs/passport` + `passport` (new). JWT strategy via `passport-jwt`; local (email+password) strategy via `passport-local`. See `docs/documents/auth-passport-techstack.md` for the four decision tables (custom-guard vs. passport-jwt; built-in vs. custom cookie extractor; convert-login vs. leave-it; global-`TokenModule` vs. `AuthModule`-local provider placement).
- Token signing/verification: unchanged — `JwtStrategy` still reads `JWT_ACCESS_SECRET` via `ConfigService`; `JwtTokenService` (in `@Global() TokenModule`) stays exactly as-is and is still used by `RefreshTokenService` and by `LoginService`'s token-signing tail.
- No new environment variables. No change to `IEmailSender`, the DTOs, or any non-login route.

### Commands

Unchanged project-wide (see `docs/rules/bun.md` / `docs/rules/workflow.md`):

```
Build:  bun run build
Test:   bun run test        (bun run test:cov for coverage)
Lint:   bun run lint        (never `bunx eslint` directly)
Dev:    bun run start:dev
```

New dependency install (use whatever versions `bun add` resolves — no manual pinning, matching the email-sender cycle's `bun add nodemailer` precedent):

```
bun add @nestjs/passport passport passport-jwt passport-local
bun add -d @types/passport-jwt @types/passport-local
```

Four runtime deps + two dev deps — installing anything beyond these is an "Ask first" (see Boundaries).

### Project Structure

Additive where possible; the two edited existing files keep their exported class/constant names so no downstream call site changes.

```
src/common/
  strategies/
    jwt.strategy.ts            (new) — class JwtStrategy extends PassportStrategy(Strategy, "jwt")
    jwt.strategy.spec.ts       (new) — unit: cookie extractor + validate() pass-through
    local.strategy.ts          (new) — class LocalStrategy extends PassportStrategy(Strategy);
                                        exports the ValidatedLoginUser interface (its validate() return contract)
    local.strategy.spec.ts     (new) — unit: all credential-checking cases (moved from login.service.spec.ts)
  guards/
    jwt-auth.guard.ts          (edit) — JwtAuthGuard now extends AuthGuard("jwt"); overrides handleRequest;
                                         still exports ACCESS_TOKEN_COOKIE from THIS file (export location unchanged)
    jwt-auth.guard.spec.ts     (rewrite) — test handleRequest in isolation (see Testing Strategy)
  token/                       (untouched — TokenModule stays @Global(), zero changes)

src/modules/auth/
  application/services/
    login.service.ts           (edit) — shrinks to token-signing only; execute({ user, role }: ValidatedLoginUser): LoginResult
    login.service.spec.ts      (rewrite) — token-signing only
  presentation/
    auth.controller.ts         (edit) — login route only: @UseGuards(RateLimitGuard, AuthGuard("local")), reads req.user
    auth.controller.spec.ts    (edit) — login-route test updated to the new guard/req.user flow
  auth.module.ts               (edit) — add PassportModule.register({ defaultStrategy: "jwt" }) + JwtStrategy + LocalStrategy providers
  auth.module.spec.ts          (edit if it asserts the provider/import list — it currently does)

docs/documents/
  auth.md                      (edit — Update-docs phase) — reflect the Passport-based guard/login, the two strategies, and the new module wiring
  auth-passport-techstack.md   (new, already written) — the four decision tables
```

`ValidatedLoginUser` placement (judgment call): **exported from `src/common/strategies/local.strategy.ts`**, colocated with the `validate()` that produces it — it is that strategy's return contract. `AuthController` imports the type from there. It is a **route-local shape** (`{ user, role }`), deliberately **different** from `AuthenticatedRequest`'s `AccessTokenPayload` `req.user` used on JWT-guarded routes — this is **not** a change to `AuthenticatedRequest`.

### Code Style

Match existing NestJS DI/class conventions. `JwtStrategy` (note the custom cookie extractor — `passport-jwt` ships none):

```ts
import { ACCESS_TOKEN_COOKIE } from "../guards/jwt-auth.guard";
import { type AccessTokenPayload } from "../types/jwt-payload";
import { type Request } from "express";
import { Strategy, type StrategyOptionsWithoutRequest } from "passport-jwt";

import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PassportStrategy } from "@nestjs/passport";

import { type EnvironmentVariables } from "@/config/env.validation";

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, "jwt") {
  constructor(configService: ConfigService<EnvironmentVariables, true>) {
    super({
      jwtFromRequest: (req: Request): string | null => (req.cookies?.[ACCESS_TOKEN_COOKIE] as string | undefined) ?? null,
      ignoreExpiration: false,
      secretOrKey: configService.get("JWT_ACCESS_SECRET", { infer: true }),
    } satisfies StrategyOptionsWithoutRequest);
  }

  // Pure pass-through: the access token is already self-contained (sub/roleSlug/level/permissions);
  // today's guard never hits the DB, and this preserves that property exactly.
  validate(payload: AccessTokenPayload): AccessTokenPayload {
    return payload;
  }
}
```

`JwtAuthGuard` keeps the same class name + the same `ACCESS_TOKEN_COOKIE` export, and preserves today's two exact 401 messages via `handleRequest`:

```ts
export const ACCESS_TOKEN_COOKIE = "access_token";

@Injectable()
export class JwtAuthGuard extends AuthGuard("jwt") {
  handleRequest<TUser = AccessTokenPayload>(err: unknown, user: TUser, info: unknown): TUser {
    // passport-jwt sets info to an Error("No auth token") when the extractor yields no token.
    if (info instanceof Error && info.message === "No auth token") {
      throw new UnauthorizedException("Missing access token");
    }
    // Any other failure: err, a JWT verification error (TokenExpiredError/JsonWebTokenError), or no user.
    if (err || !user) {
      throw new UnauthorizedException("Invalid or expired access token");
    }
    return user;
  }
}
```

> Note the deliberate coupling: the `"No auth token"` branch depends on `passport-jwt`'s internal message string. Confirmed with the user as preferable to collapsing both cases into one generic message. This is a **known, accepted tradeoff**, not a gap — documented in `auth-passport-techstack.md` so a future `passport-jwt` upgrade is a known place to re-check.

`LocalStrategy.validate` absorbs `LoginService`'s current credential logic **verbatim** (dummy-hash timing mitigation, message strings, status codes, ordering all preserved) and returns `{ user, role }`:

```ts
export interface ValidatedLoginUser {
  user: UserEntity;
  role: RoleEntity;
}
// super({ usernameField: "email" }); injects USER_REPOSITORY + ROLE_REPOSITORY (same tokens LoginService uses today).
// validate(email, password): not-found → bcrypt.compare(password, DUMMY_PASSWORD_HASH) then 401 "Invalid email or password";
// wrong password → same 401; !verified → 403 "Email not verified..."; !roleId → same 401; else resolve role → return { user, role }.
```

`LoginService` shrinks to token-signing only (synchronous — no `await` left, no `USER_REPOSITORY`/`ROLE_REPOSITORY`, no `LoginDto`):

```ts
execute({ user, role }: ValidatedLoginUser): LoginResult {
  const accessToken = this.jwtTokenService.signAccessToken({ sub: user.documentId, roleSlug: role.slug, level: role.level, permissions: role.permissions });
  const refreshToken = this.jwtTokenService.signRefreshToken({ sub: user.documentId });
  return { accessToken, refreshToken };
}
```

`AuthController.login`: guard list becomes `@UseGuards(RateLimitGuard, AuthGuard("local"))` (import `AuthGuard` from `@nestjs/passport`). It keeps `@Body() dto: LoginDto` in the signature **purely for Swagger request-body introspection** even though the handler no longer reads `dto`, and reads `req.user` (typed `ValidatedLoginUser`) via `@Req()`, passing it straight to `this.loginService.execute(req.user)`, then sets cookies exactly as today. Everything else in the controller is untouched.

> Build-phase detail (do not resolve in the spec): the unread `@Body() dto` may trip `no-unused-vars`/`@typescript-eslint/no-unused-vars`. The Build phase should check `eslint.config.mjs`'s `argsIgnorePattern`/rule config and either rely on the existing config or rename to `_dto`, whichever this repo's lint config expects.

### Testing Strategy

Jest, unit tests only, next to each source file — same convention as the rest of `auth` (see `docs/documents/auth.md`'s Tests section). No `coverageThreshold` entries for the new strategy files unless the user asks (opt-in per path, per the workflow rule).

- **`jwt.strategy.spec.ts` (new):** unit-test the cookie extractor function (returns the token when the cookie is present; returns `null` when `req.cookies` is absent/empty) and that `validate(payload)` returns the payload unchanged (pass-through).
- **`local.strategy.spec.ts` (new):** carries **all** the credential-checking cases that used to live in `login.service.spec.ts`. Enumerated:
  1. email not found → `bcrypt.compare` against `DUMMY_PASSWORD_HASH` **is called** (timing mitigation) and `UnauthorizedException` ("Invalid email or password") is thrown.
  2. wrong password → `UnauthorizedException` (same message).
  3. unverified user → `ForbiddenException` ("Email not verified...").
  4. verified user with no `roleId` → `UnauthorizedException` (same generic message).
  5. success → resolves the role via `IRoleRepository.findById` and returns `{ user, role }`.
- **`login.service.spec.ts` (rewrite):** token-signing only — given `{ user, role }`, asserts `signAccessToken`/`signRefreshToken` are called with the right payloads and returns `{ accessToken, refreshToken }`. No repository mocks anymore.
- **`jwt-auth.guard.spec.ts` (rewrite):** the guard is now an `AuthGuard("jwt")` subclass, so its only repo-owned logic is `handleRequest`. **Test `handleRequest` in isolation** — call it directly with synthetic `err`/`user`/`info` arguments — rather than trying to drive the full Passport `canActivate` chain. Rationale: `canActivate` is inherited from `AuthGuard("jwt")` (framework code, not this repo's) and shouldn't be re-tested; the three branches worth covering are all in `handleRequest`: `info = Error("No auth token")` → "Missing access token"; a truthy `err` or verification-error `info` or `!user` → "Invalid or expired access token"; a valid `user` → returned unchanged.
- **`auth.controller.spec.ts` (edit):** update the login-route test — the handler now reads `req.user` (a `ValidatedLoginUser`) and passes it to `loginService.execute(req.user)`; assert cookies are still set with the right `httpOnly`/`secure`/`sameSite` options.
- **`auth.module.spec.ts` (edit):** update if it asserts the imports/providers list — it currently does (expects 3 imports and an exact providers array). It must now account for `PassportModule.register(...)` in imports and `JwtStrategy` + `LocalStrategy` in providers.

**No new e2e tests** for this cycle — consistent with `auth.md`'s existing "no e2e tests" scope decision for this module.

**Manual verification checkpoint (required before "done"):** same pattern as the SMTP-sender spec. Passport's request-handling wiring (cookie extraction, guard chain, `req.user` shape) is exactly the kind of thing that passes unit tests but can break on a real HTTP round trip. Before this is considered fully done, someone must run `bun run start:dev` against a real DB and manually walk through:

- login **success** (valid verified user → cookies set),
- login **wrong-password** (→ 401, same message),
- login **unverified-user** (→ 403 "Email not verified..."),
- one JWT-guarded route, e.g. `GET /api/v1/roles`, with and without a valid `access_token` cookie (→ 200 vs. 401 "Missing access token").

### Boundaries

**Always do:**

- Keep the exported names stable: `JwtAuthGuard` (class), `ACCESS_TOKEN_COOKIE` (constant, in `jwt-auth.guard.ts`) — every downstream `@UseGuards`/import must keep working untouched.
- Preserve today's exact login/JWT-guard messages and status codes (401 "Missing access token" / "Invalid or expired access token" / "Invalid email or password"; 403 "Email not verified, please check your inbox").
- Move the `DUMMY_PASSWORD_HASH` timing-mitigation `bcrypt.compare` verbatim into `LocalStrategy` — the not-found path must still cost the same as the wrong-password path.
- Run `bun run lint`, `bun run build`, `bun run test:cov`, and Prettier on all changed `.ts` files before any commit.

**Ask first:**

- Any change to `TokenModule` — it should stay untouched; flag it if the Build phase finds a reason it *must* change.
- Any change to error messages / status codes on existing auth routes.
- Installing any package beyond the four runtime + two dev packages listed under Commands.
- Committing — explicit Yes/No confirmation with the exact staged file list and full commit message shown, no `Co-Authored-By` (per `docs/rules/workflow.md` commit rules).

**Never do:**

- Touch `RefreshTokenService` or the `refresh`/`logout` routes — they stay entirely manual/non-Passport (the user's chosen scope: only login + the JWT guard convert to Passport).
- Implement any OAuth provider strategy (Google/GitHub/...), OAuth callback/redirect route, or any related config — deferred to a future cycle; this cycle is groundwork only.
- Change `AuthenticatedRequest`'s `AccessTokenPayload` `req.user` shape (`ValidatedLoginUser` is a separate, login-route-local type — it does not replace it).
- Move `ACCESS_TOKEN_COOKIE`'s export out of `jwt-auth.guard.ts`.
- Touch the register/verify-otp/resend-otp/forgot-password/reset-password flows, `IEmailSender`, `RegisterService`/`VerifyOtpService`/etc.
- Add `coverageThreshold` entries for the new strategy files unless the user asks (opt-in only, per the workflow rule).
- Declare this done without the manual verification checkpoint above.

### Success Criteria

- [ ] `@nestjs/passport`, `passport`, `passport-jwt`, `passport-local` (runtime) + `@types/passport-jwt`, `@types/passport-local` (dev) installed — nothing else added.
- [ ] `JwtStrategy` (`passport-jwt`, name `"jwt"`, custom cookie extractor, pass-through `validate`) and `LocalStrategy` (`passport-local`, `usernameField: "email"`, absorbs all credential logic, returns `{ user, role }`) exist under `src/common/strategies/`.
- [ ] `JwtAuthGuard` extends `AuthGuard("jwt")`, keeps the same class name + `ACCESS_TOKEN_COOKIE` export, and reproduces today's exact two 401 messages via `handleRequest`.
- [ ] `LoginService.execute` takes `ValidatedLoginUser` and does token-signing only (synchronous); `AuthController.login` uses `@UseGuards(RateLimitGuard, AuthGuard("local"))` and reads `req.user`.
- [ ] `auth.module.ts` registers `PassportModule.register({ defaultStrategy: "jwt" })` + both strategies as providers; `TokenModule` is untouched.
- [ ] Every downstream `@UseGuards(JwtAuthGuard, ...)` and `ACCESS_TOKEN_COOKIE` import across users/roles/permissions/media/document/content-type/auth-logout compiles and behaves unchanged (zero call-site edits).
- [ ] All specs updated/rewritten as listed; `bun run build`, `bunx tsc --noEmit`, `bun run lint`, `bun run test:cov` pass with zero new errors.
- [ ] `docs/documents/auth.md` updated (Update-docs phase) to reflect the Passport-based guard/login + two strategies.
- [ ] Manual verification checkpoint (login success/wrong-password/unverified + one JWT-guarded route) completed against a real DB before declaring done.

### Open Questions

- None blocking — packages, both strategy designs, the `handleRequest` message-preservation approach, the login conversion (chosen among three scoped options), and `AuthModule`-local provider placement were all resolved with the user during spec review.
- One Build-phase detail to settle **during** Build, not now: whether the unread `@Body() dto: LoginDto` on the login route needs `_dto` renaming or is already covered by `eslint.config.mjs`'s `argsIgnorePattern` (check the config; don't guess).
