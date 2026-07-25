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
- [ ] `bun add nodemailer && bun add -d @types/nodemailer`
- [ ] `smtp-email.sender.ts` — `SmtpEmailSender implements IEmailSender`
- [ ] `smtp-email.sender.spec.ts` — `nodemailer` mocked, no real network calls
- [ ] **Checkpoint 2:** adapter spec green, `bun run build` clean

## Phase 3 — Wiring
- [ ] `resolve-email-sender.ts` — `resolveEmailSender(config)` selection function
- [ ] `resolve-email-sender.spec.ts` — both branches
- [ ] `auth.module.ts` — `useFactory: resolveEmailSender, inject: [ConfigService]`
- [ ] `auth.module.spec.ts` — update exact-equality `providers` assertion
- [ ] **Checkpoint 3:** `bun run build`, `bunx tsc --noEmit`, `bunx eslint`, `bun run test:cov` all clean — commit

## Phase 4 — Docs
- [ ] `docs/documents/auth.md` — close the `ConsoleEmailSender`-only gap
- [ ] `docs/documents/auth-issues-fix.md` — finding #10 "Update: resolved" note
- [ ] `SPEC.md` — trim back to pointer line
- [ ] **Checkpoint 4:** doc read-through — commit

## Phase 5 — Manual verification (non-blocking for the Phase 3 commit)
- [ ] User sets real `SMTP_*`/`EMAIL_FROM`/`FRONTEND_URL` in their own `.env`
- [ ] User confirms real OTP + reset-password emails send and render correctly
