# Todo — `[CAREFUL]` Integrate CORS check

See `tasks/plan.md` for full context and rationale.

## Phase 1 — Env validation + pure parse function
- [x] `env.validation.ts` — add required `CORS_ORIGINS!: string` (no default)
- [x] `env.validation.spec.ts` — add `CORS_ORIGINS` to shared `requiredConfig`; one rejection test (empty value throws)
- [x] `configure-app.ts` — add `parseCorsOrigins(raw): string[]` (comma-split, trim, drop empty segments)
- [x] `configure-app.spec.ts` — `describe("parseCorsOrigins", ...)` block (single origin; multi with whitespace; empty segment ignored)
- [x] **Checkpoint 1:** `bun run lint && bun run build && bun test src/config/env.validation.spec.ts src/bootstrap/configure-app.spec.ts` green — commit

## Phase 2 — `configureCors` wiring + test coverage
- [x] `docs/documents/bootstrap-cors-techstack.md` (new) — single-delegate vs. two-middleware comparison table + `cors`-source evidence + `/health` fallthrough note
- [x] `configure-app.ts` — `configureCors(app, configService)`: single delegate branching on `req.path.startsWith("/api/v1/public/documents/")` → open/no-credentials, else → strict allowlist/credentials; wired into `configureApp` after `trust proxy` line (used locally-defined types, not `@nestjs/common`'s unexported `CorsOptionsDelegate`/`CorsOptionsCallback`)
- [x] `configure-app.spec.ts` sub-step 1 (do first): update `ConfigService` mock in both existing describe blocks to return `CORS_ORIGINS` — breaks every existing test otherwise
- [x] `configure-app.spec.ts` sub-step 2: synthesized `PublicDocumentsEchoController` + new `describe("configureApp CORS", ...)` — 4 cases (allowed origin credentialed; disallowed origin rejected; public-docs open+no-credentials; OPTIONS preflight)
- [x] **Checkpoint 2:** `bun run lint && bun run build && bun run test` (full suite) green, no regression — commit

## Phase 3 — Docs
- [x] `.env.example` — comment documenting `CORS_ORIGINS` format, example `http://localhost:3000`
- [x] `docs/documents/cors.md` (new) — two policies, single-delegate mechanism + why, `/health` note, env contract
- [x] `docs/ENTRYPOINT.md` — add bullet for `docs/documents/cors.md`
- [x] `docs/cms-admin-integration.md` — §1 real policy + how to get an origin added; §7 remove resolved gap
- [x] **Checkpoint 3:** doc read-through, no stale "CORS not configured" mentions — commit

## Phase 4 — Five-axis review (Opus) + fixes + `SPEC.md` trim + close-out
- [x] Run the review on **Opus** (`[CAREFUL]` requires it) — verdict: APPROVE, no blocking issues
- [x] Five-axis review — no request hits both policy branches; `credentials:false` always paired with open origin; empty-array parse is deny-all not wildcard (traced `cors` source)
- [x] Fixed: `CORS_ORIGINS=","` boot-time gap (parsed-empty-array now throws at boot) + 2 test-coverage gaps (public-docs credentials/preflight); re-verified build/test/lint all green (698 tests)
- [x] `SPEC.md` — trimmed to pointer at `docs/documents/cors.md` (+ techstack doc); deleted `specs/cors.md`
- [x] **Checkpoint 4 (final):** automated checks green after fixes; `SPEC.md` reduced to pointer — commit

## Phase 5 — Manual verification (non-blocking for earlier commits)
- [x] Ran `bun run start:dev` (real Postgres container); curl-verified allowed-origin (`http://localhost:5173`) credentialed headers on `/api/v1/permissions`, disallowed-origin gets no ACAO, OPTIONS preflight 204s correctly, and `/api/v1/public/documents/single-type/x` reflects any origin (incl. the allowlisted one) with no credentials header
- [x] Feature fully done — no outstanding verification
