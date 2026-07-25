# Auth Module — Code Review Fixes

Record of the 10 findings from the five-axis code review of `src/modules/auth/**` (register, verify-otp, resend-otp, login, refresh, forgot-password, reset-password) and what was done about each. See `tasks/plan.md` for the original review text in full and `docs/documents/auth.md` for the module's current end-state description.

---

## 1. Race condition — two concurrent verifications could both become `super_admin`

**Severity:** Critical

**Issue:** `VerifyOtpService.execute()` decided the first-verifier-gets-`super_admin` rule with `const isFirstVerification = !(await this.users.hasAnyVerified())` followed by a separate `this.users.update(...)`. These two steps weren't atomic. Two users completing `verify-otp` at nearly the same moment could both read `hasAnyVerified() === false` before either write landed, and both would be promoted to `super_admin` — a privilege-escalation bug in the one place the codebase grants its highest permission level.

**Resolution:** Added `IUserRepository.completeVerification(documentId, { firstVerifiedRoleId, otherwiseRoleId })`. `PrismaUserRepository` implements it as a Postgres `Serializable`-isolation transaction that counts verified users and updates the target user's role in the same transaction, with a bounded retry (3 attempts) on Prisma's `P2034` write-conflict code. `VerifyOtpService` now resolves both the `super_admin` and `guest` role documentIds up front (no side effects, safe to always do) and hands the atomic decision to the repository.

**Why this approach:**

| Option | Verdict |
|---|---|
| Transaction at default (Read Committed) isolation | **Rejected** — insufficient. Read Committed doesn't lock the count; two transactions can both observe count=0 before either commits, reproducing the exact bug. |
| Serializable transaction + retry-on-`P2034` | **Chosen.** Postgres's Serializable isolation detects the conflicting concurrent transaction and aborts one; the existing codebase already has precedent for catching specific Prisma error codes and reacting (`PrismaRoleRepository` on `P2002`/`P2025`), so this follows an established pattern rather than introducing a new one. |
| Hand-written raw-SQL atomic `UPDATE ... WHERE NOT EXISTS (...)` | **Rejected** — fully portable and would avoid isolation-level reasoning entirely, but requires dialect-specific SQL (quoting differs across Postgres/MySQL/SQLite) for what's a single-writer decision that only matters in the first few seconds of a fresh deployment. Disproportionate complexity for the actual risk window. |

**Technical apply:**
- `src/modules/users/domain/repositories/user.repository.ts` — new `CompleteVerificationRoles` interface and `completeVerification` method on `IUserRepository`. Deliberately generic (no `super_admin`/`guest` slugs in the `users` domain) — that's an `auth`-module business rule, keeping module boundaries clean per this repo's "modules independent" convention.
- `src/modules/users/infrastructure/persistence/prisma-user.repository.ts` — `completeVerification()` wraps `tx.user.count({ where: { verified: true } })` + `tx.user.update(...)` in `prisma.$transaction(fn, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable })`, retrying up to `COMPLETE_VERIFICATION_MAX_ATTEMPTS = 3` times on `PrismaClientKnownRequestError` with `code === "P2034"`.
- `src/modules/auth/application/services/verify-otp.service.ts` — replaced the `hasAnyVerified()` + `update()` pair with `Promise.all([roles.findBySlug("super_admin"), roles.findBySlug("guest")])` followed by one `users.completeVerification(...)` call.

**Trade-off:** Retrying on write-conflict means the *loser* of a race pays extra latency (one more transaction round-trip) rather than failing outright — acceptable since this only happens in the narrow window before any user has verified. The retry loop is unreachable-by-design once `COMPLETE_VERIFICATION_MAX_ATTEMPTS` is exhausted (throws the last error), which is covered by an `/* istanbul ignore next */` on the truly-dead final line rather than a fake test.

---

## 2 & 3. `username` duplication race + unhandled `email` duplication race

**Severity:** Important

**Issue:** `RegisterService.execute()` checked `findByEmail`/`findByUsername` for duplicates, then called `create()` — a classic check-then-act race. `username` had no database unique constraint at all (`prisma/postgresql/schema.prisma`), so two concurrent registrations with the same username would both silently succeed — no error, no 409, just a duplicate. `email` **did** have a DB unique constraint, so a race would fail — but nothing in the codebase translated Prisma's `P2002` violation, so it surfaced as an unhandled 500 instead of the intended 409.

**Resolution:** Added `@unique` to `User.username` in `prisma/postgresql/schema.prisma` (migration `20260724133336_add_username_unique`). Added a `UserAlreadyExistsError` domain error, mirroring the existing `RoleAlreadyExistsError` pattern in `role.repository.ts` exactly. `PrismaUserRepository.create()` catches `P2002`, inspects `error.meta.target` to report which field collided, and throws the domain error; `RegisterService` catches it and rethrows `ConflictException`. The original `findByEmail`/`findByUsername` pre-checks stay in place — they're the fast, cheap path for the overwhelming majority of real duplicate-registration attempts; the new catch is purely the race-safety net.

**Why this approach:**

| Option | Verdict |
|---|---|
| Copy the existing `RoleAlreadyExistsError`/`P2002`-catch pattern from `role.repository.ts` | **Chosen.** Already reviewed and in production in this codebase for the identical problem shape (unique-slug collision on `Role`/`Permission`). Zero new architectural surface. |
| Rely on the pre-check alone, skip the DB constraint | **Rejected.** Without a DB-level unique constraint, the race isn't just "returns the wrong error" — it silently succeeds and creates a genuinely duplicate username, which is a correctness bug the application layer alone cannot close. |
| A new generic "unique constraint violation" exception filter (Nest `ExceptionFilter`) | **Rejected for this cycle.** Would be a good longer-term investment (removes the need to hand-write this catch in every repository), but it's a cross-cutting change affecting every module, not scoped to the auth fix cycle. Left as a possible future refactor, not attempted here. |

**Technical apply:**
- `prisma/postgresql/schema.prisma` — `username String` → `username String @unique`.
- `prisma/postgresql/migrations/20260724133336_add_username_unique/migration.sql` — `CREATE UNIQUE INDEX "users_username_key" ON "users"("username");`. Applied to the local dev DB via `prisma migrate deploy` (the CLI's interactive `migrate dev` isn't usable in this non-TTY environment; the migration file itself follows Prisma's exact standard-generated format and naming convention, matching the existing `users_email_key` index).
- `src/modules/users/domain/repositories/user.repository.ts` — `UserAlreadyExistsError extends Error`, constructed with `(field: "email" | "username", value: string)`.
- `src/modules/users/infrastructure/persistence/prisma-user.repository.ts` — `create()` wrapped in try/catch; `findByUsername()` switched from `findFirst` to `findUnique` now that the column is actually unique.
- `src/modules/auth/application/services/register.service.ts` — `create()` call wrapped in try/catch mapping `UserAlreadyExistsError` → `ConflictException`.

**Trade-off:** None significant — this closes a real correctness gap with an established, low-risk pattern. The only cost is the one-time migration step, which was run against the local dev DB with explicit user confirmation beforehand (schema/DB changes are an ask-first gate per this repo's workflow rules).

---

## 4 & 9. No password-strength policy; no `username` format constraint

**Severity:** Important (password) / Suggestion (username format)

**Issue:** `RegisterDto.password` and `ResetPasswordDto.newPassword` only carried `@IsString @IsNotEmpty` — a single-character password was accepted end-to-end. `RegisterDto.username` had no format constraint at all, accepting whitespace, emoji, or control characters, which also compounds finding #2/#3 (whitespace-variant "duplicates").

**Resolution:** Added `@MinLength(8)` to both password fields. Added `@Matches(/^[a-zA-Z0-9_.-]{3,32}$/)` to `username` (letters, digits, `_`, `.`, `-`; 3–32 characters).

**Why this approach:**

| Option | Verdict |
|---|---|
| Length-only minimum (8 chars), no forced complexity rules | **Chosen** (confirmed with the user). Matches current NIST 800-63B / OWASP ASVS L1 guidance, which favors length over composition rules — forced complexity (must contain a symbol, a digit, etc.) is now considered to push users toward predictable patterns without meaningfully raising entropy, and this project already pairs the password with bcrypt hashing and per-route rate limiting. |
| 12-char / composition-rule policy (ASVS L2-leaning) | **Rejected** — more signup/reset friction for a CMS's admin-and-editor user base, not clearly justified by this app's threat model. |
| Conventional username charset (alphanumeric + `_`/`.`/`-`, 3–32 chars) | **Chosen** — uncontroversial, matches common platform conventions (GitHub-, Slack-style handles), and directly closes the "whitespace/emoji variant" angle from #9 without adding round-trip validation calls. |

**Technical apply:**
- `src/modules/auth/application/dto/register.dto.ts` — `password: @IsString @MinLength(8)`; `username: @Matches(USERNAME_PATTERN, { message: "..." })`.
- `src/modules/auth/application/dto/reset-password.dto.ts` — `newPassword: @IsString @MinLength(8)`.

**Trade-off:** None meaningful. This is a pure input-validation tightening; existing valid registrations (test fixtures, seeded data) already exceed both new minimums.

---

## 5. `RateLimitGuard` buckets shared across all auth routes, not per-route as documented

**Severity:** Important

**Issue:** `RateLimitGuard.canActivate()` keyed its token-bucket `Map` purely on `request.ip`. The guard is attached via class-reference (`@UseGuards(RateLimitGuard)`) to six different `AuthController` handlers and is never registered as an explicit provider, so Nest resolves it as a single shared instance — meaning its bucket map was shared across register/verify-otp/resend-otp/login/forgot-password/reset-password for any given IP, contradicting `docs/documents/auth.md`'s "per-IP+per-route" description. In practice, hammering `/register` from one IP would also throttle that IP's `/login` attempts.

**Resolution:** The bucket key now includes the route: `` `${ip}:${ControllerClassName}.${HandlerMethodName}` ``, read via Nest's own `ExecutionContext.getClass()`/`getHandler()`.

**Why this approach:**

| Option | Verdict |
|---|---|
| `context.getClass().name` + `context.getHandler().name` | **Chosen.** Framework-native — works identically regardless of the underlying HTTP adapter (Express here, but Nest also supports Fastify), and doesn't depend on router-internal state. |
| Express `req.route.path` | **Rejected** — ties the guard to Express-specific request-lifecycle internals (route matching timing, `req.route` population) instead of Nest's own execution-context abstraction. |

**Technical apply:**
- `src/common/guards/rate-limit.guard.ts` — `canActivate()` builds `route = `${context.getClass().name}.${context.getHandler().name}`` and `key = `${ip}:${route}``.
- `src/common/guards/rate-limit.guard.spec.ts` — `contextForIp` helper now stubs `getClass`/`getHandler`; added a test proving two different routes on the same IP get independent buckets.
- `docs/documents/auth.md` — corrected the guard's description to "per-`(ip, controller class, handler method)`".

**Trade-off:** None — this is a straightforward correctness fix that makes the implementation match the documented (and clearly intended) behavior.

---

## 6. No `trust proxy` configuration

**Severity:** Important

**Issue:** Nothing in `src/main.ts`/`src/bootstrap/configure-app.ts` called `app.set('trust proxy', ...)`. If this API runs behind any reverse proxy or load balancer, Express's `req.ip` — which `RateLimitGuard` keys on — resolves to the proxy's address for every client, collapsing all rate-limit buckets into one shared bucket per route.

**Resolution:** Confirmed with the user: this API is deployed on Render.com, which fronts every web service with its own single-hop edge proxy before traffic reaches the container. Added a `TRUST_PROXY` env var (default `"1"` — trust exactly one hop) and wired it into `app.set('trust proxy', ...)`.

**Why this approach:**

| Option | Verdict |
|---|---|
| `TRUST_PROXY="1"` (trust exactly one hop) | **Chosen** — matches Render's documented single-edge-proxy architecture. Trusting exactly one hop means `X-Forwarded-For`'s last entry (Render's edge) is honored, but nothing further up an arbitrary forwarded chain is — a client can't spoof its own IP by sending a fake `X-Forwarded-For` header, because Express only trusts the hop count configured, not attacker-supplied header content. |
| `TRUST_PROXY=true` (trust the entire chain) | **Rejected** — would trust every hop in a client-supplied `X-Forwarded-For` header, which is spoofable if a client sends one directly, bypassing the actual proxy. |
| No trust-proxy config (status quo) | **Rejected** — this is the bug being fixed; every client would resolve to Render's edge IP, collapsing rate limits. |

**Technical apply:**
- `src/config/env.validation.ts` — `TRUST_PROXY: string = "1"`.
- `src/bootstrap/configure-app.ts` — new `parseTrustProxy(raw: string)` helper (parses `"true"`/`"false"` to booleans, numeric strings to numbers for hop-count, anything else passed through as-is for named presets like `"loopback"` or CIDR lists); `configureApp` now reads `ConfigService`, resolves `TRUST_PROXY`, and calls `app.set("trust proxy", parseTrustProxy(trustProxy))`. `configureApp`'s parameter type changed from `INestApplication` to `NestExpressApplication` (the base interface has no `.set()`); `main.ts` updated to call `NestFactory.create<NestExpressApplication>(AppModule)` accordingly.
- `src/bootstrap/configure-app.spec.ts` — added a `ConfigService` provider to the test module (previously absent — `configureApp` didn't need it before); added unit tests for `parseTrustProxy`'s three branches.

**Trade-off:** The default (`"1"`) is specific to Render's current architecture. If the deployment topology changes (an additional CDN or LB hop is added in front of Render, or the app is ever exposed with no proxy at all), this env var needs to be updated — it is not self-detecting. This is called out explicitly in `docs/documents/auth.md`'s Known Gaps.

---

## 7 & 8. Timing side-channels on login and forgot-password

**Severity:** Suggestion

**Issue:** `LoginService.execute()` returned immediately (no `bcrypt.compare`) when the user wasn't found, but ran a real `bcrypt.compare` on the wrong-password path — the two paths return the identical error message, but the *timing* differs by however long bcrypt takes (tens of milliseconds), which can be used to enumerate registered emails. `ForgotPasswordService.execute()` had the same shape: instant return for an unknown email vs. `randomBytes`+hash+DB-write+email-send for a known one.

**Resolution:** `LoginService` now runs `bcrypt.compare(dto.password, DUMMY_PASSWORD_HASH)` (a precomputed bcrypt hash of an arbitrary string, no corresponding account) on the not-found path before throwing. `ForgotPasswordService` now generates the random token and its SHA-256 hash **unconditionally**, before checking whether a user was found, discarding the result on the not-found path (no DB write, no email).

**Why this approach:**

| Option | Verdict |
|---|---|
| Dummy work matching the real branch's CPU cost | **Chosen.** Directly closes the CPU-bound half of the timing gap with a small, self-contained change; consistent with the standard mitigation for this exact class of issue (constant-time auth response). |
| Full wall-clock equalization (simulate DB write + email dispatch delay) | **Rejected** — would require artificially delaying every response by a fixed amount or faking a DB round-trip, adding real complexity and risk (e.g. accidentally touching the DB) for a Suggestion-level finding on routes that are already rate-limited. Documented as a known, deliberate partial mitigation rather than silently claiming full equalization. |

**Technical apply:**
- `src/modules/auth/application/services/login.service.ts` — `DUMMY_PASSWORD_HASH` constant (a real precomputed bcrypt hash); not-found branch now does `await bcrypt.compare(dto.password, DUMMY_PASSWORD_HASH)` before throwing `UnauthorizedException`.
- `src/modules/auth/application/services/forgot-password.service.ts` — `randomBytes(32)` + `createHash("sha256")` moved above the `if (!user) return;` check; the DB `update()` and `sendPasswordResetEmail()` calls remain conditional on `user` existing.

**Trade-off:** Explicitly a **partial** mitigation — equalizes CPU-bound cost only, not the full request wall-clock time (DB write + email dispatch on the known-email path are still extra work the unknown-email path skips). Documented as such in `docs/documents/auth.md` rather than overstating the fix. Also: attempts to unit-test this behavior via `jest.spyOn` on `node:crypto`'s and `bcryptjs`'s exports failed in this environment (`TypeError: Cannot redefine property`) — both modules export non-configurable properties under this project's Bun+Jest setup. This matches the codebase's existing convention of not spying on crypto primitives (see `reset-password.service.spec.ts`, which independently recomputes expected hashes rather than spying) — the fix is verified by code inspection and the pre-existing "no side effects on unknown email" tests, not a dedicated timing-behavior test.

---

## 10. `ConsoleEmailSender` is still the only `IEmailSender`

**Severity:** Suggestion

**Issue:** `ConsoleEmailSender` (`auth.module.ts`'s binding for `EMAIL_SENDER`) logs raw OTPs and password-reset tokens via Nest's `Logger` instead of sending real email. This was already documented in `docs/documents/auth.md`'s Known Gaps as a one-line-swap-later decision before this review — re-confirmed still true, not a new finding.

**Resolution:** **No code change in this cycle.** Re-confirmed the gap and restated it explicitly as a pre-launch checklist item in this document and in `docs/documents/auth.md`.

**Why no code change:** Swapping in a real provider requires a product/ops decision this fix cycle isn't positioned to make unilaterally — which provider (SendGrid, SES, Resend, Postmark, ...), account/credential provisioning, and deliverability setup (SPF/DKIM, sender domain) are all decisions outside "fix the review findings." Inventing a specific integration without that decision would violate this repo's "don't add things beyond what's needed" convention and risks committing to the wrong vendor.

**Technical apply:** None. Left `{ provide: EMAIL_SENDER, useClass: ConsoleEmailSender }` in `auth.module.ts` exactly as-is.

**Trade-off:** Every OTP and password-reset token continues to land in application logs in plaintext until a real provider is wired in. This is an accepted, explicitly-tracked gap — not something to lose track of before any non-dev deployment that handles real user accounts.

**Update: resolved.** A separate build cycle (see `SPEC.md` / `tasks/plan.md`) added `SmtpEmailSender` (`nodemailer`-backed, `infrastructure/email/smtp-email.sender.ts`) alongside `ConsoleEmailSender`, selected env-driven via `resolveEmailSender` (`SMTP_HOST` set → real sender, else the `ConsoleEmailSender` dev/test fallback) — see `docs/documents/auth.md`'s Domain port section. The product/ops provider decision this finding deferred was made: SMTP via `nodemailer`, deferring the specific vendor to config rather than a hard-coded SDK. Real SMTP credentials/`EMAIL_FROM`/`FRONTEND_URL` and a live-inbox send confirmation are still the user's to do — tracked as the outstanding manual-verification step in `docs/documents/auth.md`.
