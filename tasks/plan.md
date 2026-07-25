# Plan: Real Email Sender for OTP + Password-Reset (`[CAREFUL]`)

See `SPEC.md` for the active spec and `docs/documents/auth-email-techstack.md` for the provider decision. This plan implements a real `IEmailSender` adapter (`SmtpEmailSender`, via `nodemailer`) for the two auth emails (OTP verification, password reset), replacing `ConsoleEmailSender` as the production binding while keeping it as the zero-config dev/test fallback.

## Context

`docs/documents/auth-issues-fix.md` finding #10 flagged that `ConsoleEmailSender` — which just logs OTPs and password-reset tokens instead of emailing them — is still the only `IEmailSender` implementation, and explicitly deferred fixing it as a separate decision requiring a product/ops call on provider. `SPEC.md` now captures that decision: add `SmtpEmailSender` with inline-HTML templates for both emails, selected over `ConsoleEmailSender` via an env-driven switch (`SMTP_HOST` set → real sender, else fallback) so local dev/test needs zero setup. No change to `IEmailSender`'s interface, DTOs, or any auth service — purely a new infrastructure adapter plus wiring.

Slicing note: this is a single cohesive infrastructure swap, not several independent user-facing features, so tasks are ordered by dependency (config → templates → adapter → wiring) rather than by vertical user-story slices. Each task still lands independently testable/verifiable code per its own acceptance criteria.

## Key files

- `src/modules/auth/domain/ports/email-sender.port.ts` — `IEmailSender` (unchanged)
- `src/modules/auth/infrastructure/email/console-email.sender.ts` — existing fallback (unchanged)
- `src/modules/auth/auth.module.ts` — DI wiring, currently `{ provide: EMAIL_SENDER, useClass: ConsoleEmailSender }`
- `src/modules/auth/auth.module.spec.ts` — asserts the exact `providers` array via `Reflect.getMetadata` — **must be updated** alongside the wiring change or it fails
- `src/config/env.validation.ts` / `env.validation.spec.ts` — env var schema + its test (pattern: `@Transform` for bools/numbers, every field has a default so `validateSync` always succeeds)
- `src/common/guards/rate-limit.guard.ts` — reference pattern for `ConfigService<EnvironmentVariables, true>` typed injection with `.get(KEY, { infer: true })`
- `src/modules/auth/application/services/forgot-password.service.ts` — source of the plaintext `resetToken` passed to `sendPasswordResetEmail`

## Confirmed decisions (asked the user directly, during the Spec phase)

1. Provider/transport: SMTP via `nodemailer` — no vendor account exists yet, so defer that choice to config (`SMTP_HOST`/etc.) rather than hard-coding a vendor SDK. Full comparison in `docs/documents/auth-email-techstack.md`.
2. Env-driven switch between `ConsoleEmailSender` (dev/test) and the real sender — not "always real."
3. Templates: inline TS template-literal functions, no templating-engine dependency.
4. Password-reset link source: new `FRONTEND_URL` env var, placeholder value — user fills in the real domain later.
5. Sender identity: new `EMAIL_FROM` env var, placeholder value — user fills in the real verified address later.
6. `[CAREFUL]` tag: this Build (plan) step and the later five-axis Review step run on Opus; Spec, Build (execute), Update spec/docs, Clean up stay on Sonnet.

## Tasks

### Phase 0 — Env config
- [x] `env.validation.ts` — add `SMTP_HOST`/`SMTP_PORT`/`SMTP_USER`/`SMTP_PASSWORD`/`SMTP_SECURE`/`EMAIL_FROM`/`FRONTEND_URL`, all optional-with-defaults
- [x] `env.validation.spec.ts` — add default-value assertions for all seven new vars
- [x] **Checkpoint 0:** `bun run test env.validation.spec.ts` green

### Phase 1 — Templates
- [x] `templates/otp-email.template.ts` — `buildOtpEmailHtml({ otp })`, mentions the real 10-minute OTP expiry
- [x] `templates/reset-password-email.template.ts` — `buildResetPasswordEmailHtml({ resetUrl })`, mentions the real 1-hour reset-token expiry
- [x] Spec files for both, asserting interpolated values appear in output
- [x] **Checkpoint 1:** template specs green

### Phase 2 — Adapter
- [x] `bun add nodemailer && bun add -d @types/nodemailer`
- [x] `smtp-email.sender.ts` — `SmtpEmailSender implements IEmailSender`, one `Transporter` built in the constructor from `ConfigService`, `sendOtpEmail`/`sendPasswordResetEmail` call `sendMail` with the Phase 1 templates
- [x] `smtp-email.sender.spec.ts` — `jest.mock("nodemailer")`, assert `sendMail` args (`to`/`from`/`subject`/`html` contents); no real network calls
- [x] **Checkpoint 2:** adapter spec green, `bun run build` clean

### Phase 3 — Wiring
- [x] `resolve-email-sender.ts` — `resolveEmailSender(config)` returns `SmtpEmailSender` when `SMTP_HOST` is set, else `ConsoleEmailSender`; standalone function for unit-testability without a Nest `TestingModule`
- [x] `resolve-email-sender.spec.ts` — both branches
- [x] `auth.module.ts` — swap `useClass: ConsoleEmailSender` for `{ useFactory: resolveEmailSender, inject: [ConfigService] }`
- [x] `auth.module.spec.ts` — update the exact-equality `providers` assertion to match the new factory-shaped entry
- [x] **Checkpoint 3:** `bun run build`, `bunx tsc --noEmit`, `bunx eslint`, `bun run test:cov` all clean — **commit here** (workflow checkpoint-timing rule: Phase 4's docs work and the manual-verification checkpoint don't block this commit)

### Phase 4 — Docs
- [x] `docs/documents/auth.md` — replace the "`ConsoleEmailSender` is still the only `IEmailSender`" Known Gap with the new env-driven-selection description
- [x] `docs/documents/auth-issues-fix.md` finding #10 — add an "Update: resolved" note
- [x] `SPEC.md` — trim back to a pointer line once the above fully capture the end state
- [x] **Checkpoint 4:** doc read-through, no doc still claims `ConsoleEmailSender` is the only implementation — commit

### Phase 5 — Manual verification (non-blocking for the Phase 3 commit)
- [ ] User sets real `SMTP_*`/`EMAIL_FROM`/`FRONTEND_URL` in their own `.env` (not touched by the agent — global rule)
- [ ] User runs `bun run start:dev`, triggers `POST /api/auth/register` and `POST /api/auth/forgot-password` against a real inbox, confirms both HTML emails render and links/codes work
- [ ] Tracked as outstanding until the user confirms — same pattern as the still-open manual e2e walkthrough already noted in `auth.md`

## Verification (end-to-end)

1. `bun run build && bunx tsc --noEmit && bunx eslint . && bun run test:cov` — all green, zero new lint/type errors.
2. No test performs a real network call (`nodemailer` is `jest.mock`'d everywhere it's used in a spec).
3. Manual (Phase 5, user-performed): real SMTP send confirmed for both email types.
