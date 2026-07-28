# Todo — Integrate `@nestjs/passport` as the auth-strategy framework (`[CAREFUL]`)

See `tasks/plan.md` for full context and rationale.

## Phase 1 — Install + JWT half (`JwtStrategy` + `JwtAuthGuard` conversion)
- [x] `bun add @nestjs/passport passport passport-jwt passport-local && bun add -d @types/passport-jwt @types/passport-local`
- [x] `jwt.strategy.ts` — `JwtStrategy extends PassportStrategy(Strategy, "jwt")`, custom cookie extractor, pass-through `validate`
- [x] `jwt.strategy.spec.ts` — cookie extractor (present → token / absent → null) + `validate` pass-through
- [x] `jwt-auth.guard.ts` — rewrite to `extends AuthGuard("jwt")` + `handleRequest` (two exact 401 messages); keep `ACCESS_TOKEN_COOKIE` export here
- [x] `jwt-auth.guard.spec.ts` — rewrite: test `handleRequest` in isolation (all three branches)
- [x] `auth.module.ts` — add `PassportModule.register({ defaultStrategy: "jwt" })` + `JwtStrategy` provider (partial wiring)
- [x] `auth.module.spec.ts` — imports length 3→4 + positional PassportModule check; add `JwtStrategy` to providers array
- [x] **Checkpoint 1:** `bun run build` / `bunx tsc --noEmit` / `bun run lint` / `bun run test:cov` green — commit (still-green intermediate: JWT routes on Passport, login unchanged)

## Phase 2 — Login half (`LocalStrategy` + shrunk `LoginService` + `AuthController.login` + remaining wiring)
- [x] `local.strategy.ts` — `LocalStrategy` (`usernameField: "email"`), credential logic moved verbatim, returns `{ user, role }`; export `ValidatedLoginUser`
- [x] `local.strategy.spec.ts` — all five credential cases moved from `login.service.spec.ts`
- [x] `login.service.ts` — shrink to synchronous `execute(ValidatedLoginUser): LoginResult`, token-signing only
- [x] `login.service.spec.ts` — rewrite: token-signing only, no repository mocks
- [x] `auth.controller.ts` — login route: `@UseGuards(RateLimitGuard, AuthGuard("local"))`, read `req.user`; checked `eslint.config.mjs` — no `argsIgnorePattern`/unused-param rule fires, `_dto` rename not needed (confirmed via `bun run lint`, not guessed)
- [x] `auth.controller.spec.ts` — update login-route test to `req.user` → `loginService.execute(req.user)`; assert cookies set
- [x] `auth.module.ts` — add `LocalStrategy` provider
- [x] `auth.module.spec.ts` — add `LocalStrategy` to providers array
- [x] **Checkpoint 2:** `bun run build` / `bunx tsc --noEmit` / `bun run lint` / `bun run test:cov` green — commit (last code phase; not held open for Phase 5 manual verification)

## Phase 3 — Docs (`auth.md`)
- [x] `docs/documents/auth.md` — Passport-based guard/login, two strategies, module wiring, updated Tests section; cross-link `auth-passport-techstack.md`
- [x] **Checkpoint 3:** doc read-through — no section still describes the old hand-rolled guard/login — commit

## Phase 4 — Five-axis review (Opus) + fixes + `SPEC.md` trim + close-out
- [x] Run the review on **Opus** (`[CAREFUL]` requires it — don't run on Sonnet)
- [x] Five-axis review over the full cycle diff (message parity, timing mitigation, `req.user` shape, `TokenModule` untouched)
- [x] Fix Important/correctness findings; re-verify build/test/lint; record findings + resolutions — fixed the guards-before-pipes `LocalStrategy` input-validation gap (see `tasks/plan.md`)
- [x] `SPEC.md` — trim to a one-line pointer at `docs/documents/auth.md` (+ techstack doc)
- [x] **Checkpoint 4 (final):** automated checks green after fixes; `SPEC.md` reduced to pointer — commit

## Phase 5 — Manual verification (non-blocking for the Phase 2 commit)
- [ ] User runs `bun run start:dev` against a real DB: login success (cookies set), wrong-password (401), unverified-user (403), one JWT-guarded route with/without a valid `access_token` cookie (200 vs 401 "Missing access token")
- [ ] Tracked open until the user confirms — required before the feature is fully done
