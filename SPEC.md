# Spec

## Active spec: `[CAREFUL]` Real email sender for OTP + password-reset

Per `docs/rules/workflow.md`'s `[CAREFUL]` rule: use Opus for the **Build (plan)** and **Review** phases; Sonnet for Spec, Build (execute), Update spec, Update docs, Clean up.

### Objective

Close finding #10 from `docs/documents/auth-issues-fix.md`: `ConsoleEmailSender` is the only `IEmailSender` implementation today — every OTP and password-reset token lands only in application logs, never a real inbox. Add a real adapter that sends actual HTML emails for the two flows the `auth` module already supports:

- **OTP verification email** — sent by `RegisterService`/`ResendOtpService` via `IEmailSender.sendOtpEmail({ email, otp })`.
- **Password-reset email** — sent by `ForgotPasswordService` via `IEmailSender.sendPasswordResetEmail({ email, resetToken })`.

No behavior change to the auth services themselves, the `IEmailSender` port's method signatures, or any DTO/route — this is purely a new infrastructure adapter plus templates, wired in via the existing `EMAIL_SENDER` DI token in `auth.module.ts`.

**Success looks like:** setting real SMTP credentials in the environment causes register/resend-otp/forgot-password to deliver a real, well-formatted HTML email instead of a log line, while local dev/test with no SMTP env vars set keeps working exactly as today (`ConsoleEmailSender`, no real network calls).

### Tech Stack

- Transport: SMTP via `nodemailer` (new dependency). See `docs/documents/auth-email-techstack.md` for the full comparison against Resend/SES/Postmark SDKs and why SMTP wins for this repo.
- Templates: inline TypeScript template functions returning HTML strings (template literals) — no new templating-engine dependency, consistent with "don't add deps beyond what's needed."
- No change to `IEmailSender`, `EMAIL_SENDER` token, or any existing auth DTO/service.

### New environment variables

Defaults/shape to add to `src/config/env.validation.ts` (all optional with safe empty defaults so local dev/test needs zero setup):

| Var | Purpose | Example |
|---|---|---|
| `SMTP_HOST` | SMTP server host | `smtp.mailtrap.io` |
| `SMTP_PORT` | SMTP server port | `587` |
| `SMTP_USER` | SMTP auth username | — |
| `SMTP_PASSWORD` | SMTP auth password | — |
| `SMTP_SECURE` | `true`/`false` — use TLS | `false` |
| `EMAIL_FROM` | `From` header, name + address | `AbyssOfTime <no-reply@abyssoftime.example>` |
| `FRONTEND_URL` | Base URL used to build the password-reset link | `https://app.example.com` |

**Selection rule:** `auth.module.ts` binds `EMAIL_SENDER` to the real `SmtpEmailSender` when `SMTP_HOST` is set, otherwise falls back to `ConsoleEmailSender` — env-driven switch, no separate "environment name" flag to keep in sync.

I will not read, create, or edit any `.env*` file myself (global rule) — the user must add the real values to their own `.env`/`.env.local`. I'll document the required keys in `docs/documents/auth.md` and leave `.env.example` (if one exists) for the user to update, or do it only if explicitly asked and the filename doesn't match `.env*`... it does, so this stays a user action either way.

### Commands

Unchanged project-wide (see `docs/rules/bun.md`):

```
Build:  bun run build
Test:   bun run test        (bun run test:cov for coverage)
Lint:   bun run lint
Dev:    bun run start:dev
```

New dependency install: `bun add nodemailer && bun add -d @types/nodemailer`.

### Project Structure

All new files inside the existing `auth` module (no new module — this is additive infrastructure per `docs/rules/workflow.md`'s "minimize effect/coupling" rule):

```
src/modules/auth/
  infrastructure/
    email/
      console-email.sender.ts        (existing, untouched)
      console-email.sender.spec.ts   (existing, untouched)
      smtp-email.sender.ts           (new) — IEmailSender impl using nodemailer
      smtp-email.sender.spec.ts      (new) — unit tests, nodemailer transport mocked
      templates/
        otp-email.template.ts        (new) — buildOtpEmailHtml({ otp }): string
        reset-password-email.template.ts (new) — buildResetPasswordEmailHtml({ resetUrl }): string
        templates.spec.ts            (new) — snapshot/assertion tests on generated HTML
  auth.module.ts                     (edit) — conditional EMAIL_SENDER provider
src/config/
  env.validation.ts                  (edit) — new SMTP_*/EMAIL_FROM/FRONTEND_URL vars
docs/documents/
  auth.md                            (edit) — replace "ConsoleEmailSender is the only IEmailSender" gap with the new state
  auth-email-techstack.md            (new, already written) — provider decision record
```

### Code Style

Match the existing `ConsoleEmailSender` shape exactly — same constructor injection style, same `Injectable()` + `Logger` pattern for error logging:

```ts
@Injectable()
export class SmtpEmailSender implements IEmailSender {
  private readonly logger = new Logger(SmtpEmailSender.name);
  private readonly transporter: Transporter;

  constructor(private readonly config: ConfigService) {
    this.transporter = nodemailer.createTransport({
      host: this.config.get<string>("SMTP_HOST"),
      port: this.config.get<number>("SMTP_PORT"),
      secure: this.config.get<boolean>("SMTP_SECURE"),
      auth: { user: this.config.get<string>("SMTP_USER"), pass: this.config.get<string>("SMTP_PASSWORD") },
    });
  }

  async sendOtpEmail({ email, otp }: SendOtpEmailParams): Promise<void> {
    await this.transporter.sendMail({
      from: this.config.get<string>("EMAIL_FROM"),
      to: email,
      subject: "Verify your email",
      html: buildOtpEmailHtml({ otp }),
    });
  }
}
```

Template functions are pure, side-effect-free, and take a plain params object — no class, no DI:

```ts
export function buildOtpEmailHtml({ otp }: { otp: string }): string {
  return `<!doctype html>...<p>Your verification code is <strong>${otp}</strong>. It expires in 10 minutes.</p>...`;
}
```

### Testing Strategy

Jest, unit tests only, next to each source file — same convention as the rest of `auth` (`docs/documents/auth.md`'s Tests section).

- `smtp-email.sender.spec.ts` — mock `nodemailer.createTransport` (module-level `jest.mock("nodemailer")`), assert `sendMail` is called with the right `to`/`from`/`subject` and that the `html` body contains the OTP/reset link. No real network calls, ever, in tests.
- `templates.spec.ts` — assert the generated HTML contains the interpolated values (OTP digits, reset URL) and is escaped/safe (see Boundaries — no unescaped user input in templates beyond what's already validated by the DTOs).
- No `coverageThreshold` entries added for these files unless the user asks — matches `docs/rules/workflow.md`'s coverage-threshold rule (opt-in per path, not required).
- Manual verification: since this sends real email, a full manual check (real SMTP creds, real inbox) is a **Build phase checkpoint**, not something CI/unit tests can cover — same pattern as the still-outstanding manual e2e walkthrough noted in `auth.md`.

### Boundaries

- **Always do:** keep `IEmailSender`'s method signatures unchanged; keep `ConsoleEmailSender` as the zero-config dev/test fallback; run `bun run lint`/`bun run build`/`bun run test:cov` before any commit; run Prettier on all changed `.ts` files.
- **Ask first:** any change to `auth.module.ts` DI wiring beyond the conditional `EMAIL_SENDER` provider; any new dependency beyond `nodemailer`/`@types/nodemailer`; adding a templating-engine dependency instead of inline TS templates; any change to `IEmailSender`'s interface or to the DTOs/services that call it; committing (per `docs/rules/workflow.md` commit rules — explicit yes/no confirmation with staged files + message shown).
- **Never do:** log the real OTP/reset token at `info`/`log` level in the new `SmtpEmailSender` (only `ConsoleEmailSender` is allowed to do that, deliberately, for local dev); read/write/create/delete any `.env*` file; send a real email from an automated test; commit real SMTP credentials anywhere in the repo.

### Success Criteria

- [ ] `SmtpEmailSender` implements `IEmailSender` and is selected over `ConsoleEmailSender` when `SMTP_HOST` is set.
- [ ] OTP email and password-reset email each render from a dedicated HTML template function with the correct dynamic content (OTP code; reset link built from `FRONTEND_URL` + token).
- [ ] `bun run build`, `bunx tsc --noEmit`, `bunx eslint`, `bun run test:cov` all pass.
- [ ] No test sends a real network request.
- [ ] `docs/documents/auth.md` updated to reflect the new state (finding #10 in `auth-issues-fix.md` no longer an open gap, or explicitly re-scoped if only partially closed).
- [ ] User has manually verified at least one real send (register-flow OTP email, forgot-password email) against real SMTP credentials before this is considered fully done — flagged as a Build-phase checkpoint, not something to claim without it.

### Open Questions

- None blocking — all prior open questions (provider, env-switch strategy, template approach, reset-link URL source, sender identity) were resolved with the user during spec review. Real SMTP credentials, the real `FRONTEND_URL`, and the real `EMAIL_FROM` address remain the user's to fill in later (placeholders/env-var names only, per this spec).
