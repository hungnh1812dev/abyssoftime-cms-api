# Todo — Real Email Sender for OTP + Password-Reset (`[CAREFUL]`)

See `tasks/plan.md` for full context and rationale.

## Phase 0 — Env config
- [x] `env.validation.ts` — `SMTP_HOST`/`SMTP_PORT`/`SMTP_USER`/`SMTP_PASSWORD`/`SMTP_SECURE`/`EMAIL_FROM`/`FRONTEND_URL`, all optional-with-defaults
- [x] `env.validation.spec.ts` — default-value assertions for all seven
- [x] **Checkpoint 0:** `bun run test env.validation.spec.ts` green

## Phase 1 — Templates
- [x] `templates/otp-email.template.ts` + spec
- [x] `templates/reset-password-email.template.ts` + spec
- [x] **Checkpoint 1:** template specs green

## Phase 2 — Adapter
- [x] `bun add nodemailer && bun add -d @types/nodemailer`
- [x] `smtp-email.sender.ts` — `SmtpEmailSender implements IEmailSender`
- [x] `smtp-email.sender.spec.ts` — `nodemailer` mocked, no real network calls
- [x] **Checkpoint 2:** adapter spec green, `bun run build` clean

## Phase 3 — Wiring
- [x] `resolve-email-sender.ts` — `resolveEmailSender(config)` selection function
- [x] `resolve-email-sender.spec.ts` — both branches
- [x] `auth.module.ts` — `useFactory: resolveEmailSender, inject: [ConfigService]`
- [x] `auth.module.spec.ts` — update exact-equality `providers` assertion
- [x] **Checkpoint 3:** `bun run build`, `bunx tsc --noEmit`, `bunx eslint`, `bun run test:cov` all clean — commit

## Phase 4 — Docs
- [x] `docs/documents/auth.md` — close the `ConsoleEmailSender`-only gap
- [x] `docs/documents/auth-issues-fix.md` — finding #10 "Update: resolved" note
- [x] `SPEC.md` — trim back to pointer line
- [x] **Checkpoint 4:** doc read-through — commit

## Phase 5 — Manual verification (non-blocking for the Phase 3 commit)
- [ ] User sets real `SMTP_*`/`EMAIL_FROM`/`FRONTEND_URL` in their own `.env`
- [ ] User confirms real OTP + reset-password emails send and render correctly
