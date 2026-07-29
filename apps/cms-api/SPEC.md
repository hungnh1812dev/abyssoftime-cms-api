# Spec: `rememberMe` support in login

## Objective

`POST /api/v1/auth/login` currently issues a fixed-lifetime refresh token (~7d) regardless of user intent. Add an optional `rememberMe` flag to the login request so a user can opt into a longer-lived session (30 days) instead of the current default (7 days), matching the common "remember me" UX pattern. The access token's own TTL (~15m) is unaffected — it is unrelated to session persistence and already refreshes automatically off the refresh token.

**User**: any end user of the CMS-Admin frontend (or any API consumer) logging in via `/api/v1/auth/login`.

**Success looks like**: a user who checks "remember me" stays logged in for 30 days of inactivity-free browsing (refresh token/cookie survives that long); a user who doesn't check it keeps today's exact 7-day behavior, byte-for-byte unchanged. The choice survives every `/auth/refresh` rotation until the user logs out or the extended token itself expires.

## Assumptions (confirmed with the user before writing this spec)

1. `rememberMe` is optional on `LoginDto`; omitting it (or `false`) is **fully backward compatible** — existing clients see zero behavior change (7d refresh token/cookie, as today).
2. `rememberMe: true` extends the refresh token (and its cookie's `maxAge`) to **30 days**.
3. The access token stays fixed at **15 minutes** regardless of `rememberMe` — keeps the security model (short-lived access token embedding `roleSlug`/`level`/`permissions`) unchanged.
4. The choice must survive `POST /auth/refresh` token rotation: it is embedded in the refresh token's own JWT payload (`RefreshTokenPayload.rememberMe`) so `RefreshTokenService` can read it back and re-apply the same 30d lifetime on every subsequent rotation, indefinitely, until logout — not a one-time extension at login only.
5. No new database table/column, no server-side session storage — stays consistent with this module's existing stateless design (`docs/documents/auth.md`, "No server-side token revocation" — note that a 30-day, un-revocable refresh token makes that accepted tradeoff somewhat more consequential; still out of scope to fix here).

## Tech Stack

No new dependencies. Uses what's already in place: NestJS, `@nestjs/jwt` (via `JwtTokenService`), `@nestjs/passport` (`passport-local` for the login route), `class-validator`/`class-transformer`, `@nestjs/swagger`, Jest for tests, Bun as the runtime/package manager.

## Commands

```
Build:  bun run build
Test:   bun run test            # or: bun run test:cov for coverage
Lint:   bun run lint
Dev:    bun run start:dev
```

Per project convention, always use `bun run lint`, never `bunx eslint .` directly.

## Project Structure (files touched — no new files)

```
src/modules/auth/application/dto/login.dto.ts                  → add rememberMe?: boolean
src/modules/auth/application/services/login.service.ts         → thread rememberMe into signed refresh token + return its maxAge
src/modules/auth/application/services/refresh-token.service.ts → read rememberMe back off the verified refresh token, re-apply on rotation
src/modules/auth/presentation/auth.controller.ts                → login() reads dto.rememberMe; setAuthCookies() takes a dynamic refresh-cookie maxAge
src/common/types/jwt-payload.ts                                 → RefreshTokenPayload gains rememberMe: boolean
src/common/token/jwt-token.service.ts                            → signRefreshToken() picks 7d vs 30d expiresIn based on payload.rememberMe
```

**Important nuance** (confirmed from `LocalStrategy`/`AuthGuard("local")`): `LoginDto` is bound via `@Body()` at the Pipes stage, which runs *after* `AuthGuard("local")` (Guards stage) has already authenticated via `LocalStrategy.validate(email, password)` reading raw `req.body`. That's unrelated to `rememberMe` — the guard/strategy never touches it, only `email`/`password` — so `dto.rememberMe` is validated normally by the global `ValidationPipe` and safely readable in the `login()` handler body exactly like any other `@Body()` field. No change needed to `LocalStrategy`.

Existing spec files alongside each touched source file get updated in the same PR (`login.service.spec.ts`, `refresh-token.service.spec.ts`, `jwt-token.service.spec.ts`, `auth.controller.spec.ts`) — no new test files, no new directories.

## Code Style

Match existing patterns exactly. `LoginDto` gains one optional, validated field:

```ts
export class LoginDto {
  @ApiProperty({ example: "user@example.com" })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: "SecurePass123!" })
  @IsString()
  @IsNotEmpty()
  password!: string;

  @ApiProperty({ example: false, required: false, default: false })
  @IsOptional()
  @IsBoolean()
  rememberMe?: boolean;
}
```

`JwtTokenService` adds one named-constant TTL alongside the existing two, rather than branching on a magic string inline:

```ts
const ACCESS_TOKEN_TTL = "15m";
const REFRESH_TOKEN_TTL = "7d";
const REFRESH_TOKEN_TTL_REMEMBERED = "30d";

signRefreshToken(payload: RefreshTokenPayload): string {
  const expiresIn = payload.rememberMe ? REFRESH_TOKEN_TTL_REMEMBERED : REFRESH_TOKEN_TTL;
  return this.jwtService.sign(payload, { secret: this.configService.get("JWT_REFRESH_SECRET", { infer: true }), expiresIn });
}
```

`LoginResult` (shared by `LoginService`/`RefreshTokenService`, consumed by `AuthController`) gains the cookie `maxAge` the controller should apply, so the controller never re-derives TTL logic itself and the two hardcoded-constant locations (`jwt-token.service.ts` TTL strings, `auth.controller.ts` `maxAge` numbers) stay driven from one place:

```ts
export interface LoginResult {
  accessToken: string;
  refreshToken: string;
  refreshTokenMaxAgeMs: number;
}
```

`setAuthCookies` takes that value as a parameter instead of the current fixed `REFRESH_TOKEN_MAX_AGE_MS` constant; `ACCESS_TOKEN_MAX_AGE_MS` stays a fixed constant, unchanged.

## Testing Strategy

Jest, unit-only (mocked repositories/services), tests live next to source (`*.spec.ts`) — matching this module's existing convention (`docs/documents/auth.md` § Tests). No `coverageThreshold` gate exists project-wide; still, match existing per-file coverage quality.

Required new/updated cases:
- `jwt-token.service.spec.ts`: `signRefreshToken({ sub, rememberMe: true })` uses the 30d TTL; `rememberMe: false`/omitted uses 7d (assert via the mocked `JwtService.sign` call's `expiresIn` option, matching this file's existing assertion style).
- `login.service.spec.ts`: `execute()` with `rememberMe: true` signs a refresh token embedding `rememberMe: true` and returns the 30d `refreshTokenMaxAgeMs`; without it, returns today's 7d value.
- `refresh-token.service.spec.ts`: a refresh token whose payload carries `rememberMe: true` re-signs a new refresh token that **also** carries `rememberMe: true` and returns the 30d `refreshTokenMaxAgeMs` — proving the flag survives rotation; `rememberMe: false`/absent (old tokens issued before this change) falls back to 7d.
- `auth.controller.spec.ts`: `login()` passes `dto.rememberMe` through to `loginService.execute`; the `res.cookie` assertion for `refresh_token` is extended to check `maxAge` varies with the service's returned `refreshTokenMaxAgeMs`, following the existing `expect.objectContaining({ httpOnly, secure, sameSite })` pattern at `auth.controller.spec.ts` (login test).

Manual verification (per this project's existing outstanding-item pattern in `docs/documents/auth.md`): log in with `rememberMe: true` against a real DB via `bun run start:dev`, inspect the `Set-Cookie` header's `Max-Age`/`Expires`, then call `/auth/refresh` and confirm the rotated cookie still carries the 30-day value; repeat with `rememberMe` omitted and confirm 7 days, unchanged from current production behavior.

## Boundaries

- **Always do**: keep the access token TTL fixed at 15m; keep `rememberMe` optional and default-`false`-equivalent so every existing client (cms-admin, any script) is unaffected without changes; run `bun run lint`, `bun run test`, `bun run build` before considering the change done; update `docs/documents/auth.md` (the TTL/cookie table, DTO list, and `RefreshTokenPayload` description) to reflect the new field, per this repo's workflow (`docs/rules/workflow.md`: spec → build → update spec/docs → review → cleanup).
- **Ask first**: changing the 7d/30d values themselves once implemented; adding any server-side session/revocation store (out of scope — stays stateless, consistent with the documented "no server-side token revocation" tradeoff); changing `COOKIE_SECURE`/`COOKIE_SAMESITE` or any other env-driven cookie attribute; touching `LocalStrategy` (not needed per the nuance above, but flagging since it's adjacent code).
- **Never do**: make the access token long-lived; silently change behavior for callers that don't send `rememberMe`; log or expose the raw refresh token or its `rememberMe` flag in any response body (responses stay `{ message }` only, per existing convention); add a dependency for this.

## Success Criteria

- `POST /auth/login` with no `rememberMe` (or `false`) in the body → `refresh_token` cookie `Max-Age` unchanged at 7 days (identical to current production behavior).
- `POST /auth/login` with `rememberMe: true` → `refresh_token` cookie `Max-Age` is 30 days.
- `POST /auth/refresh` using a refresh token minted with `rememberMe: true` → the newly rotated `refresh_token` cookie is again 30 days (flag persists across rotation).
- `POST /auth/refresh` using a refresh token minted with `rememberMe` false/absent (including tokens issued before this change ships) → rotated cookie is 7 days.
- Access token TTL/cookie `Max-Age` stays 15 minutes in all cases.
- `bun run build`, `bun run lint`, `bun run test:cov` all pass with zero errors.
- `docs/documents/auth.md` updated to describe the new field/behavior.

## Open Questions

None outstanding — all four design decisions (default-cookie behavior, extended TTL value, rotation-propagation mechanism, access-token scope) were confirmed with the user before this spec was written.
