# Auth Email Sender — Provider Decision

Comparison for closing finding #10 in `docs/documents/auth-issues-fix.md` (`ConsoleEmailSender` is still the only `IEmailSender`). Scope: pick the transport the real adapter uses to send the OTP-verification and password-reset emails.

## Options considered

| Option | Fit for this repo | Complexity | Maintenance cost | Existing precedent | Vendor lock-in | Bun/Jest compat risk |
|---|---|---|---|---|---|---|
| **SMTP via `nodemailer`** | High — works against any SMTP-capable provider (SES SMTP, Resend SMTP, Postmark SMTP, Gmail, a dev sandbox like Mailtrap, or a self-hosted MTA) without a code change, just env vars | Low — one well-known package, `createTransport` + `sendMail` | Low — single dependency, standard NestJS integration shape | None directly, but matches the "portable across runtimes/vendors" preference already shown by choosing `bcryptjs` over `Bun.password` (`auth.md` Known Gaps) | None — swapping providers later is an env-var change | Low — plain Node API, no Bun-only calls (the same class of risk that broke `Bun.password` under Jest is avoided) |
| Resend SDK | Medium — good DX, but ties the codebase to Resend's HTTP API and account | Low–Medium — small SDK, but a new vendor-specific dependency | Low, but switching providers later means a code change, not just config | None | High | Low — thin HTTP client |
| AWS SES SDK v3 | Low — no AWS infra/credentials anywhere in this project today (`package.json` has zero `@aws-sdk/*` deps) | High — multi-package SDK (`@aws-sdk/client-ses` + transitive deps), heavier footprint | Medium — AWS SDK v3 ships frequent minor releases | None | High | Low, but adds significant dependency weight for a project with no existing AWS surface |
| Postmark SDK | Medium | Low–Medium | Low | None | High | Low |

## Chosen: SMTP via `nodemailer`

No email provider is selected yet (confirmed with the user), so the adapter should not hard-code a decision the user hasn't made. SMTP defers that choice entirely to configuration — `SMTP_HOST`/`SMTP_PORT`/`SMTP_USER`/`SMTP_PASSWORD` can point at SES's SMTP endpoint, Resend's SMTP endpoint, Postmark's SMTP endpoint, or a free dev sandbox (Mailtrap) — with zero code change when the real provider is picked later. It also keeps the dependency footprint minimal, consistent with this project's demonstrated preference (see the `bcryptjs` vs. `Bun.password` call in `docs/documents/auth.md`) for portable, low-weight choices over vendor SDKs.

**Trade-off:** SMTP transport is marginally slower per-send than a provider's native HTTP API and doesn't get provider-specific features (e.g. Resend's analytics, SES's configuration sets) for free. Acceptable — those are optimizations for a later, deliberate provider decision, not blockers for closing this gap.
