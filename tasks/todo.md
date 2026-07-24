# Todo — Auth Module Hardening (fix code-review findings)

See `tasks/plan.md` for full context and rationale.

## Phase 0 — DTO validation (#4, #9)
- [x] `register.dto.ts` — `@MinLength(8)` on `password`, `@Matches(/^[a-zA-Z0-9_.-]{3,32}$/)` on `username`
- [x] `reset-password.dto.ts` — `@MinLength(8)` on `newPassword`
- [x] **Checkpoint 0:** relevant DTO/service specs updated and green

## Phase 1 — Rate limit + trust proxy (#5, #6)
- [x] `rate-limit.guard.ts` — bucket key becomes `${ip}:${ClassName}.${HandlerName}` via `context.getClass()`/`context.getHandler()`
- [x] `rate-limit.guard.spec.ts` — update `contextForIp` helper to stub `getClass`/`getHandler`; add a test proving two different routes on the same IP get separate buckets
- [x] `env.validation.ts` — add `TRUST_PROXY: string = "1"`
- [x] `configure-app.ts` — accept resolved trust-proxy value, call `app.set('trust proxy', ...)`
- [x] `main.ts` — resolve `TRUST_PROXY` via `app.get(ConfigService)` before calling `configureApp`
- [x] `configure-app.spec.ts` — update for new signature
- [x] `docs/documents/auth.md` — correct the "per-IP+per-route" claim to match the fixed behavior
- [x] **Checkpoint 1:** `bun run build` clean, guard/configure-app specs green

## Phase 2 — Timing side-channels (#7, #8)
- [x] `login.service.ts` — add `DUMMY_PASSWORD_HASH` constant, `bcrypt.compare` against it on the not-found path
- [x] `login.service.spec.ts` — test asserting the not-found path still exercises real work (spy-based attempt hit a Bun/Jest limitation — non-configurable module exports; verified by code inspection instead, documented in auth-issues-fix.md #7/#8)
- [x] `forgot-password.service.ts` — run `randomBytes`+`createHash` (discarded) on the not-found path
- [x] `forgot-password.service.spec.ts` — existing "no side effects" test still covers the not-found path's outward behavior
- [x] **Checkpoint 2:** specs green

## Phase 3 — Schema migration (#2) (ASK-FIRST GATE — schema/migration change)
- [x] Confirm with user before running the migration
- [x] `prisma/postgresql/schema.prisma` — add `@unique` to `User.username`
- [x] `bun run prisma:migrate` (via `migrate deploy`, hand-authored migration file — `migrate dev` requires an interactive TTY unavailable in this environment) — new migration `add_username_unique`
- [x] `bun run prisma:generate`
- [x] **Checkpoint 3:** `bun run build` clean, `prisma migrate status` shows schema up to date

## Phase 4 — Race-safety net on register (#2, #3)
- [x] `user.repository.ts` — add `UserAlreadyExistsError` domain error
- [x] `prisma-user.repository.ts` — `create()` catches `P2002`, inspects `error.meta.target`, throws `UserAlreadyExistsError`; `findByUsername` switches to `findUnique` (now valid since unique)
- [x] `prisma-user.repository.spec.ts` — tests for duplicate-email and duplicate-username `P2002` translation
- [x] `register.service.ts` — catches `UserAlreadyExistsError`, rethrows `ConflictException`
- [x] `register.service.spec.ts` — race-path test (repository throws `UserAlreadyExistsError` despite pre-check passing) + rethrow-unrelated-errors test
- [x] **Checkpoint 4:** specs green

## Phase 5 — Atomic super_admin promotion (#1)
- [x] `user.repository.ts` — add `completeVerification(documentId, roles: { firstVerifiedRoleId, otherwiseRoleId }): Promise<UserEntity>` to `IUserRepository`
- [x] `prisma-user.repository.ts` — implement via `$transaction(..., { isolationLevel: Serializable })` with count-then-conditional-update, bounded retry (3 attempts) on `P2034`
- [x] `prisma-user.repository.spec.ts` — tests: first verification gets `firstVerifiedRoleId`, subsequent gets `otherwiseRoleId`, retry-then-succeed on P2034, retry exhaustion, non-conflict rethrow
- [x] `verify-otp.service.ts` — resolve both `super_admin`/`guest` role documentIds up front, delegate the atomic decision to `completeVerification`
- [x] `verify-otp.service.spec.ts` — update mocks (both roles resolved via slug-aware `findBySlug` mock), replaced the two hasAnyVerified-branch tests with one test asserting the atomic delegation contract
- [x] **Checkpoint 5:** specs green; `hasAnyVerified` no longer called from `VerifyOtpService` (kept on `IUserRepository` — still a reasonable primitive, no other caller currently needs it)

## Phase 6 — Full verification
- [x] `bun run build`
- [x] `bun run lint` (0 errors; 1 pre-existing, unrelated warning on `main.ts`)
- [x] `bun run test:cov` (59 suites, 297 tests, all green)
- [x] **Checkpoint 6:** all green

## Phase 7 — Documentation (ASK-FIRST GATE before commit)
- [x] Update `docs/documents/auth.md` to reflect final state (new DTO rules, atomic verification, rate-limit key, trust proxy, known-gaps updates)
- [x] Write `docs/documents/auth-issues-fix.md` — one entry per finding: issue / resolution / why chosen / technical apply / trade-off (including #10, documented as no-code-change)
- [x] Add `docs/documents/auth-issues-fix.md` to `docs/ENTRYPOINT.md`'s index
- [x] Remove the "Active spec" section from `SPEC.md` per the Root docs rule
- [x] **Checkpoint 7 (Review):** re-run the five-axis review against the diff — no new issues found; self-review focused on the atomic-transaction correctness, the P2002 target-matching logic, and doc/code consistency
- [ ] **Complete** — ask user to confirm commit (staged files + message) before committing
