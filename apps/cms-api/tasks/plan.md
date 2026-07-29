# Plan: `rememberMe` support in login

See `SPEC.md` for the full spec (objective, assumptions, code style, testing strategy, boundaries, success criteria).

## Context

`POST /api/v1/auth/login` gets an optional `rememberMe` flag. When true, the refresh token (and its cookie) lives 30 days instead of the current fixed 7 days; the access token stays fixed at 15 minutes regardless. The choice must survive `/auth/refresh` rotation, so it's embedded in the refresh token's own JWT payload rather than tracked anywhere server-side (this module is deliberately stateless — no DB-backed sessions, no new tables). Six files total, all in `src/common/` and `src/modules/auth/`. No new files, no new dependencies, no DB/schema changes.

Confirmed design decisions (from the spec phase, not re-litigated here):
1. Default (`rememberMe` false/omitted) is byte-identical to today's behavior — 7d refresh cookie.
2. `rememberMe: true` → 30d refresh token/cookie.
3. Access token TTL (15m) is never affected.
4. The flag is embedded in `RefreshTokenPayload` so it survives every rotation, not just a one-time login extension.
5. `LoginDto`'s `@Body()` binding validates fine post-guard (Pipes run after Guards) — `LocalStrategy`/`AuthGuard("local")` never need to touch `rememberMe`, only `email`/`password`. No changes needed there.

## Dependency graph

```
Task 1 (RefreshTokenPayload + JwtTokenService dual-TTL + maxAge helper)
    │
    ├──▶ Task 2 (LoginService threads rememberMe, LoginResult gains refreshTokenMaxAgeMs)
    │        │
    │        └──▶ Task 3 (RefreshTokenService re-applies rememberMe on rotation, old-token fallback)
    │                 │
    │                 └──▶ Task 4 (AuthController: DTO field, handler plumbing, dynamic cookie maxAge)
    │
    └──▶ Task 5 (docs/documents/auth.md update — after Checkpoint, describes final tested behavior)
```

## Task 1 — Payload type + `JwtTokenService` dual-TTL signing (foundation)

**Description**: Add `rememberMe: boolean` to `RefreshTokenPayload`. Add `REFRESH_TOKEN_TTL_REMEMBERED = "30d"` alongside the existing `ACCESS_TOKEN_TTL`/`REFRESH_TOKEN_TTL` constants in `JwtTokenService`; `signRefreshToken` picks `expiresIn` off `payload.rememberMe`. Add a `getRefreshTokenMaxAgeMs(rememberMe: boolean): number` helper on the same service (backed by matching ms constants) so the 7d/30d-in-milliseconds math lives in exactly one place, not duplicated across `LoginService`/`RefreshTokenService`/`AuthController`.

- **Acceptance**: `signRefreshToken({ sub, rememberMe: true })` signs with `expiresIn: "30d"`; `rememberMe: false` signs with `"7d"` (identical to today). `getRefreshTokenMaxAgeMs(true)`/`(false)` return the matching ms values. Access-token methods untouched.
- **Verify**: `bun run test -- src/common/token/jwt-token.service.spec.ts`
- **Dependencies**: none
- **Files**: `src/common/types/jwt-payload.ts`, `src/common/token/jwt-token.service.ts`, `src/common/token/jwt-token.service.spec.ts`
- **Size**: S

## Task 2 — `LoginService` threads `rememberMe` through

**Description**: `LoginResult` gains `refreshTokenMaxAgeMs: number`. `LoginService.execute` signature becomes `execute(validated: ValidatedLoginUser, rememberMe: boolean)` — `ValidatedLoginUser`/`LocalStrategy` stay untouched. Signs the refresh token as `{ sub: user.documentId, rememberMe }` and returns `refreshTokenMaxAgeMs` via Task 1's helper.

- **Acceptance**: `execute(validated, true)` → 30d refresh token + 30d `refreshTokenMaxAgeMs`. `execute(validated, false)` → byte-identical to current production behavior (7d). Access token signing unaffected.
- **Verify**: `bun run test -- src/modules/auth/application/services/login.service.spec.ts`
- **Dependencies**: Task 1
- **Files**: `src/modules/auth/application/services/login.service.ts`, `src/modules/auth/application/services/login.service.spec.ts`
- **Size**: S

## Task 3 — `RefreshTokenService` re-applies `rememberMe` on rotation

**Description**: After `verifyRefreshToken`, read `rememberMe` off the verified payload with an explicit `?? false` fallback — a pre-change token minted before this feature ships won't have the field at runtime even though the type says `boolean`, so the fallback (not the type system) is what satisfies backward compatibility. Re-sign the rotated refresh token with the same resolved value; return `refreshTokenMaxAgeMs` via Task 1's helper.

- **Acceptance**: payload `{ sub, rememberMe: true }` → rotated token also `true`, 30d maxAge. Payload `{ sub, rememberMe: false }` **or** `{ sub }` (old-format token, no key at all) → rotated token `false`, 7d maxAge, no throw. All three existing `UnauthorizedException` paths (invalid/expired, missing user, missing role) stay unmodified.
- **Verify**: `bun run test -- src/modules/auth/application/services/refresh-token.service.spec.ts`
- **Dependencies**: Task 1, Task 2 (imports the updated `LoginResult` shape)
- **Files**: `src/modules/auth/application/services/refresh-token.service.ts`, `src/modules/auth/application/services/refresh-token.service.spec.ts`
- **Size**: S

## Task 4 — `AuthController` wiring: DTO field, handler plumbing, dynamic cookie `maxAge`

**Description**: Add `rememberMe?: boolean` (`@IsOptional() @IsBoolean()`, with `@ApiProperty({ required: false, default: false })`) to `LoginDto`. In `login()`, call `loginService.execute(req.user, dto.rememberMe ?? false)`. Both `login()` and `refresh()` now destructure `refreshTokenMaxAgeMs` from the service result. `setAuthCookies` takes `refreshTokenMaxAgeMs` as a parameter and uses it for the refresh cookie instead of the hardcoded `REFRESH_TOKEN_MAX_AGE_MS` constant, which gets deleted. `ACCESS_TOKEN_MAX_AGE_MS` and its cookie call are untouched.

- **Acceptance**: `LoginDto` validates the optional boolean. Refresh cookie's `maxAge` varies 7d/30d based on the service call's returned value in both `login()` and `refresh()`. Access cookie stays fixed at 15m in every case. `REFRESH_TOKEN_MAX_AGE_MS` has no remaining references.
- **Verify**: `bun run test -- src/modules/auth/presentation/auth.controller.spec.ts` (extend the existing `expect.objectContaining({ httpOnly, secure, sameSite })` cookie assertions to also check `maxAge`)
- **Dependencies**: Task 2, Task 3
- **Files**: `src/modules/auth/application/dto/login.dto.ts`, `src/modules/auth/presentation/auth.controller.ts`, `src/modules/auth/presentation/auth.controller.spec.ts`
- **Size**: M

## Checkpoint — core implementation complete

Run in order: `bun run lint`, `bun run test:cov`, `bun run build` — all must pass with zero errors. Then manually walk through SPEC.md's four functional success criteria against a real DB via `bun run start:dev` (no rememberMe → 7d cookie; `rememberMe: true` → 30d cookie; `/auth/refresh` preserves the 30d flag across rotation; an old/absent-flag token falls back to 7d without crashing) — this module has no e2e coverage, so this is the only end-to-end check. Commit Tasks 1–4 together once the automated checks pass — don't hold the commit open waiting on the manual DB walkthrough.

## Task 5 — Update `docs/documents/auth.md`

**Description**: Docs-only, no source changes. Update: the DTOs list (`login.dto.ts` bullet gains `rememberMe?: boolean`); the shared-primitives bullet describing `RefreshTokenPayload` (`{ sub }` → `{ sub, rememberMe }`, note the 7d/30d branch and old-token fallback); `JwtTokenService`'s "15m / 7d expiry" phrase (add the 30d branch); the endpoints-table prose describing cookie `maxAge` (`~15min/~7d` → note the 30d extension); a short clause on `RefreshTokenService` noting it re-applies `rememberMe` on rotation.

- **Acceptance**: every place in `auth.md` stating a fixed "~7d"/`{ sub }` fact about the refresh token now reflects the conditional 7d/30d behavior + fallback. No other doc files touched, no source files touched.
- **Verify**: manual read-through against SPEC.md's Success Criteria and the actual Task 1–4 code; no automated test applies (docs-only).
- **Dependencies**: Checkpoint (Task 4 verified — docs describe final, tested behavior)
- **Files**: `docs/documents/auth.md`
- **Size**: S

## Post-implementation cleanup

Per `docs/rules/workflow.md`'s "Root docs" rule: once a feature's details are fully captured in `/docs/documents/*`, remove that feature's section from `SPEC.md`. After Task 5 + the five-axis review, replace `SPEC.md`'s content with a one-line pointer to `docs/documents/auth.md`, matching the file's existing style (see its placeholder content listing prior completed features).

## Critical files
- `src/common/types/jwt-payload.ts`
- `src/common/token/jwt-token.service.ts`
- `src/modules/auth/application/services/login.service.ts`
- `src/modules/auth/application/services/refresh-token.service.ts`
- `src/modules/auth/presentation/auth.controller.ts`
- `src/modules/auth/application/dto/login.dto.ts`
- `docs/documents/auth.md`

## Verification summary
- Per-task: `bun run test -- <spec file>` after each task.
- Checkpoint: `bun run lint && bun run test:cov && bun run build`, all clean, plus a manual `start:dev` walkthrough of the 4 functional success criteria (no e2e suite exists for this module).
- Final: five-axis review (correctness, readability, architecture, security, performance), then `SPEC.md` cleanup.
