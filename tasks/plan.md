# Plan: Auth Module Hardening (fix code-review findings)

See `SPEC.md` for the active spec. This plan implements the fixes for all 10 findings from the five-axis review of `src/modules/auth/**` (register, verify-otp, resend-otp, login, refresh, forgot-password, reset-password) and the shared `RateLimitGuard`/`configure-app.ts` it depends on.

## Context

Full review text is preserved here for traceability (scope: `src/modules/auth/**` plus schema, DTOs, `RateLimitGuard` — reviewed against the `develop` tree and `docs/documents/auth.md`):

1. **Critical** — Race condition lets two concurrent users both become `super_admin`. `verify-otp.service.ts:42-48`: `hasAnyVerified()` (check) and `users.update(...)` (act) aren't atomic. Two concurrent `verify-otp` calls can both observe `hasAnyVerified() === false` and both get promoted.
2. **Important** — `username` has no DB uniqueness constraint (`schema.prisma:68`); `register.service.ts:28-31`'s check-then-create lets two concurrent registrations silently create duplicate usernames (no error at all).
3. **Important** — Email-uniqueness has the same TOCTOU shape (`register.service.ts:23-26`); a race surfaces as an unhandled 500 (raw `PrismaClientKnownRequestError`) instead of the intended 409, since nothing in the codebase translates `P2002`.
4. **Important** — No password-strength policy: `register.dto.ts:15-17` / `reset-password.dto.ts:8-10` only apply `@IsString @IsNotEmpty`; a 1-character password is accepted end-to-end.
5. **Important** — `RateLimitGuard` (`rate-limit.guard.ts:18-19`) buckets purely by `request.ip`. It's attached via class-reference on 6 different `AuthController` handlers and resolved as one singleton, so the bucket map is shared across register/verify-otp/resend-otp/login/forgot-password/reset-password for a given IP — contradicts `docs/documents/auth.md:12`'s "per-IP+per-route" description.
6. **Important** — No `app.set('trust proxy', ...)` anywhere. Behind any reverse proxy/LB, `req.ip` collapses to the proxy's address for every client, collapsing all rate-limit buckets into one.
7. **Suggestion** — `login.service.ts:24-31` returns immediately (no `bcrypt.compare`) when the user isn't found, but runs `bcrypt.compare` on the wrong-password path — a timing side-channel that can enumerate registered emails despite the identical response message.
8. **Suggestion** — `forgot-password.service.ts:19-23` has the same shape: instant return for unknown email vs. `randomBytes`+hash+DB-write+email-send for a known one.
9. **Suggestion** — `register.dto.ts:11-13`'s `username` has no format constraint — arbitrary strings (whitespace, emoji, control chars) accepted, compounding #2.
10. **Suggestion** — `ConsoleEmailSender` (`auth.module.ts:30`) is still the only `IEmailSender`, logging raw OTPs/reset tokens via `Logger`. Already documented in `docs/documents/auth.md:17` as a known one-line-swap gap — re-confirmed, no code change in this cycle (needs a real provider + credentials, which is a separate decision outside this fix cycle's scope).

## Confirmed decisions (asked the user directly)

- **Trust proxy topology:** deployed on Render.com. Render fronts every web service with its own single-hop edge proxy before the request reaches the container (documented Render architecture) → `TRUST_PROXY` env var, default `"1"` (trust exactly one hop — not `true`, which would trust an unbounded/spoofable chain).
- **Password policy:** minimum length 8, no complexity rules (NIST 800-63B / OWASP ASVS L1 baseline; consistent with bcrypt hashing already in place and existing rate-limiting on these routes).

## Resolved design decisions (not spelled out in the review, decided during planning)

### 1. Race condition fix — where does the atomicity live?

| Option | Fit for this repo | Complexity | Correctness |
|---|---|---|---|
| Wrap `hasAnyVerified()` + `update()` in a DB transaction, default (Read Committed) isolation | Matches existing Prisma usage | Low | **Insufficient** — Read Committed doesn't lock the count; two transactions can both read count=0 before either commits |
| Interactive Prisma transaction with `Serializable` isolation + retry on write-conflict (`P2034`) | Existing precedent: `PrismaRoleRepository` already catches Prisma error codes (`P2002`/`P2025`) and translates them | Medium | **Correct** — Postgres/MySQL detect the conflicting concurrent transaction and abort one; retrying resolves it deterministically |
| New raw-SQL atomic `UPDATE ... WHERE NOT EXISTS (...)` statement | Fully portable, no isolation-level assumptions | High (hand-written SQL per dialect, bypasses Prisma's mapping/quoting) | Correct, but overkill for a single-writer bootstrap decision that happens once per deployment lifetime |

**Chosen: Serializable transaction + bounded retry on `P2034`.** This project's active/migrated database is Postgres only (`prisma/mysql`, `prisma/sqlite` schemas are empty stubs — confirmed via `find prisma/mysql prisma/sqlite -type f`, no models exist there yet), and Postgres fully supports `Serializable` isolation with `P2034` (`Transaction failed due to a write conflict`) as Prisma's documented retry signal. Raw SQL was rejected as disproportionate complexity/risk for an edge case that only matters in the first few seconds of a fresh deployment (before any user is verified).

**Where it lives:** `IUserRepository` gains one new method, `completeVerification(documentId, roles: { firstVerifiedRoleId, otherwiseRoleId })`, kept deliberately generic (no `super_admin`/`guest` slugs baked into the `users` domain — that's an `auth`-module business rule, per the "modules independent" rule in `docs/rules/workflow.md`). `VerifyOtpService` resolves both role documentIds up front (cheap, no side effects) and lets the repository make the atomic "which one" decision.

### 2/3. Username uniqueness + P2002 handling

**Chosen:** add `@unique` to `username` in `prisma/postgresql/schema.prisma` only (mysql/sqlite schemas have no models to update — same scope precedent as the access-tokens cycle's postgres-only deviation). Add a `UserAlreadyExistsError` domain error to `user.repository.ts`, mirroring the existing `RoleAlreadyExistsError` pattern in `role.repository.ts` exactly (catch `P2002` in `PrismaUserRepository.create()`, inspect `error.meta.target` to report which field collided, throw the domain error; `RegisterService` catches it and rethrows `ConflictException`). This is a direct copy of an established, already-reviewed convention in this codebase rather than a new pattern.

The existing `findByEmail`/`findByUsername` pre-checks in `RegisterService` stay as-is (fast-path UX: normal duplicate registrations get an immediate, cheap 409 without hitting a constraint violation) — the new catch is purely the race-safety net for the rare concurrent case.

### 5. Rate-limit bucket key

**Chosen:** key on `${ip}:${ControllerClassName}.${HandlerMethodName}`, read via `context.getClass().name` / `context.getHandler().name` — Nest's own `ExecutionContext`, not Express-specific `req.route` (which depends on platform/router internals and isn't guaranteed populated the same way across adapters). This keeps the guard platform-agnostic and doesn't require touching the request-type contract.

### 6. Trust proxy

**Chosen:** new `TRUST_PROXY` string env var (default `"1"`), parsed in `configure-app.ts` into whatever `Express.set('trust proxy', ...)` expects (boolean for `"true"`/`"false"`, number for a numeric string, otherwise passed through as a string for named presets like `"loopback"` or CIDR lists). `configureApp` now takes a second `trustProxy` parameter (already-resolved value) rather than reaching into `ConfigService` itself, keeping it a pure function — `main.ts` resolves the env var via `app.get(ConfigService)` before calling it, matching how `AuthController` already reads config via constructor injection rather than the function grabbing globals.

### 7/8. Timing side-channels

**Chosen:** for `LoginService`, add a module-level constant `DUMMY_PASSWORD_HASH` (a real precomputed bcrypt hash of an arbitrary string) and run `bcrypt.compare(dto.password, DUMMY_PASSWORD_HASH)` on the not-found path before throwing, so both branches pay the same bcrypt cost. For `ForgotPasswordService`, run the same `randomBytes`+`createHash` work on the not-found path (computed and discarded, no DB write, no email) so both branches pay the same CPU-bound crypto cost.

**Trade-off, stated explicitly:** this equalizes the *CPU-bound* cost (bcrypt/hash) but does **not** fully equalize wall-clock time, since the found-user path still does an extra DB write + (fire-and-forget) email dispatch that the not-found path doesn't. Full equalization would require simulating a DB round-trip and delaying the response by a fixed amount — rejected as disproportionate complexity for a Suggestion-level finding on routes that are already rate-limited. Documented as an accepted partial mitigation, not a complete fix.

### 4/9. DTO validation

**Chosen:** `@MinLength(8)` on `RegisterDto.password` and `ResetPasswordDto.newPassword`. `@Matches(/^[a-zA-Z0-9_.-]{3,32}$/)` on `RegisterDto.username` (alphanumeric + `_`/`.`/`-`, 3–32 chars) — a conventional, uncontroversial username charset that also closes the "whitespace/emoji variant" duplicate-fuzziness angle from finding #9.

### 10. ConsoleEmailSender

**No code change in this cycle.** Swapping in a real provider requires a product/ops decision (which provider, credentials, deliverability setup) outside the scope of "fix the review findings" — already flagged in `docs/documents/auth.md`'s Known Gaps as a deliberate one-line-swap-later decision. This cycle only re-confirms the gap still exists and restates it as a pre-launch checklist item in `docs/documents/auth-issues-fix.md`.

## Dependency graph

```
Phase 0: DTO validation (independent, no schema/DB changes) — #4, #9
Phase 1: Rate limit + trust proxy (independent of DB) — #5, #6
Phase 2: Timing side-channels (independent, no schema/DB changes) — #7, #8
Phase 3: schema migration (username @unique) — #2
  → Phase 4: UserAlreadyExistsError + PrismaUserRepository.create P2002 handling — #2, #3
Phase 5: IUserRepository.completeVerification + PrismaUserRepository impl + VerifyOtpService rewire — #1
Phase 6: Full verification (build/lint/test:cov)
Phase 7: Update docs/documents/auth.md + write docs/documents/auth-issues-fix.md
```

Phases 0–2 have no ordering dependency on each other or on 3–5; grouped for commit-checkpoint clarity, not because they must run sequentially.

## Patterns being reused (verified against actual source)

- **Domain error + P2002 translation** — `RoleAlreadyExistsError` / `PrismaRoleRepository.create()` (`role.repository.ts:31-36`, `prisma-role.repository.ts:28-40`), copied for `UserAlreadyExistsError`.
- **Env var validation** — `class-transformer` `@Transform` + `class-validator` decorators in `env.validation.ts`, same shape used for `COOKIE_SECURE`/`RATE_LIMIT_FPS`, reused for `TRUST_PROXY`.
- **Bcrypt hashing** — `bcryptjs`, same as every other password/OTP operation in this module (see `docs/documents/auth.md`'s Known Gaps for why `bcryptjs` and not `Bun.password`).
