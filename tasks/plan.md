# Plan: `[CAREFUL]` Integrate CORS check

See `SPEC.md` for the active spec pointer and `specs/cors.md` for the full spec. This plan wires up
real CORS handling in `src/bootstrap/configure-app.ts`, which today never calls `app.enableCors()` at
all. Two different CORS policies are needed on the same Express app: a strict, credentialed,
exact-match origin allowlist (`CORS_ORIGINS` env var) for `/api/v1/*`, and an open, non-credentialed
policy for the two unauthenticated `/api/v1/public/documents/*` routes.

## Context

Auth here is cookie-based (`access_token`/`refresh_token`, `httpOnly`), so any browser client on a
different origin (e.g. CMS-Admin) cannot make credentialed cross-origin requests until CORS is
configured — a known, documented gap (`docs/cms-admin-integration.md` §1/§7). Tagged `[CAREFUL]`
because CORS misconfiguration (wildcard/reflected origin + credentials) is a real, common
vulnerability class, not just a compatibility nuisance.

## Key files

- `src/bootstrap/configure-app.ts` — add `parseCorsOrigins` (pure function, alongside the existing
  `parseTrustProxy`) and `configureCors(app, configService)`, called from `configureApp` right after
  the existing `app.set("trust proxy", ...)` line
- `src/bootstrap/configure-app.spec.ts` — add CORS test coverage; **must** also update the
  `ConfigService` mock in both existing `describe` blocks to return a `CORS_ORIGINS` value, or every
  pre-existing test in this file breaks the moment `configureCors` is wired in
- `src/config/env.validation.ts` — add `CORS_ORIGINS!: string` (required, no default — same pattern as
  `JWT_ACCESS_SECRET`/`COOKIE_SAMESITE`)
- `src/config/env.validation.spec.ts` — add `CORS_ORIGINS` to the shared `requiredConfig` object +
  one rejection test for an empty value
- `docs/documents/bootstrap-cors-techstack.md` (new) — comparison table for the single-delegate vs.
  two-middleware decision, per `docs/rules/workflow.md`'s "Decision rationale" rule
- `docs/documents/cors.md` (new) — module doc for this bootstrap concern, following the
  `docs/documents/swagger.md` "one doc per bootstrap concern" precedent
- `docs/ENTRYPOINT.md`, `docs/cms-admin-integration.md` — updated to reflect the shipped CORS behavior
- `.env.example` — comment documenting `CORS_ORIGINS`'s comma-separated format

## Confirmed decisions (from the Spec + Plan phases, restated)

1. **Single `app.enableCors(delegate)` call**, not two separate `app.use(cors(...))` middlewares.
   Verified against `node_modules/cors/lib/index.js`: a rejected origin only *omits*
   `Access-Control-Allow-Origin` rather than clearing a previous middleware's header, and
   `Access-Control-Allow-Credentials: true` is set unconditionally whenever `credentials: true` is
   configured, regardless of origin match. Two middlewares (open CORS for public docs + a global
   strict-credentialed one) would let a public-doc request end up with both an open/reflected
   `Access-Control-Allow-Origin` (from middleware 1, never cleared) and
   `Access-Control-Allow-Credentials: true` (from middleware 2, added regardless of origin match) —
   the exact anti-pattern to avoid. A single delegate returning one fully-formed `CorsOptions` object
   per request cannot produce this combination. Full table in `docs/documents/bootstrap-cors-techstack.md`.
2. Path matching: `setGlobalPrefix("api/v1")` only bakes the prefix into controller route strings at
   Nest bootstrap — it does not rewrite the path for `app.use()`-registered middleware. The delegate
   always sees the raw path, so it must match on `/api/v1/public/documents/` (not
   `/public/documents/`).
3. `/health` (unprefixed) still passes through the same global CORS middleware and falls into the
   strict-allowlist branch by default — harmless (server-to-server/monitoring, never
   browser-fetched with credentials), documented explicitly in `docs/documents/cors.md` so it doesn't
   read as an oversight.
4. `CORS_ORIGINS` is required with no default (fails closed at boot) — comma-separated exact origins,
   no wildcards, no regex, no reflect-any-origin logic for the strict branch.
5. `.env.example`'s `CORS_ORIGINS` comment uses `http://localhost:3000` as the example origin (matches
   the existing `FRONTEND_URL` default already in `env.validation.ts`) — user's explicit choice; no
   real staging/prod origin is invented.
6. No `coverageThreshold` entry needed: `package.json` has no `coverageThreshold` key today, and
   `configure-app.ts` already has a dedicated spec file without one.
7. `[CAREFUL]` tag: Spec and this Plan step (and the later review step) should run on Opus; Build
   (execute), Update docs, and Clean up run on Sonnet — confirm current session model before
   proceeding to Build if this wasn't already switched.

## Tasks

### Phase 1 — Env validation + pure parse function
- [x] `src/config/env.validation.ts` — add `@IsString() @MinLength(1) CORS_ORIGINS!: string;` (required, no default)
- [x] `src/config/env.validation.spec.ts` — add `CORS_ORIGINS` to the shared `requiredConfig` object; add one rejection test (`CORS_ORIGINS: ""` throws)
- [x] `src/bootstrap/configure-app.ts` — add `export function parseCorsOrigins(raw: string): string[]` (comma-split, trim, drop empty segments), alongside `parseTrustProxy`
- [x] `src/bootstrap/configure-app.spec.ts` — add a `describe("parseCorsOrigins", ...)` block (single origin; multiple with whitespace; trailing comma/empty segment ignored) — standalone, no Nest app needed
- [x] **Checkpoint 1:** `bun run lint && bun run build && bun test src/config/env.validation.spec.ts src/bootstrap/configure-app.spec.ts` all green. Automatically verifiable → commit here.

### Phase 2 — `configureCors` wiring + test coverage
- [x] `docs/documents/bootstrap-cors-techstack.md` (new) — comparison table (single-delegate chosen vs. two-middleware vs. two-middleware-with-duplicated-guard), with the `cors`-source evidence and the `/health` fallthrough note
- [x] `src/bootstrap/configure-app.ts` — `import { Request } from "express"` (established pattern, see `src/common/types/authenticated-request.ts:1`); `const PUBLIC_DOCUMENTS_PATH_PREFIX = "/api/v1/public/documents/"`; add `configureCors(app, configService)` building a delegate that branches on `req.path.startsWith(PUBLIC_DOCUMENTS_PATH_PREFIX)` → `{ origin: true, credentials: false }`, else → `{ origin: parseCorsOrigins(configService.get("CORS_ORIGINS", { infer: true })), credentials: true }`; call it in `configureApp` right after `app.set("trust proxy", ...)`. Note: `@nestjs/common` does **not** export `CorsOptionsDelegate`/`CorsOptionsCallback` (only internal, `enableCors` itself is typed `options?: any`) — used a local `CorsOptionsCallback`/`CorsResponseOptions` type mirroring the `cors` package shape instead, for our own type safety.
- [x] `src/bootstrap/configure-app.spec.ts` **sub-step 1 (do first):** update the `ConfigService` mock in both existing `describe` blocks to also return a valid `CORS_ORIGINS` string — otherwise every pre-existing test in this file breaks
- [x] `src/bootstrap/configure-app.spec.ts` **sub-step 2:** add a synthesized `PublicDocumentsEchoController` (mirrors the existing `QueryEchoController` pattern) in a new `describe("configureApp CORS", ...)` block; four test cases: allowed origin on `/api/v1/*` gets credentialed CORS headers; disallowed origin does not; `/api/v1/public/documents/*` reflects an arbitrary origin with NO `Access-Control-Allow-Credentials` header; an `OPTIONS` preflight from an allowed origin returns 2xx with the right headers
- [x] **Checkpoint 2:** `bun run lint && bun run build && bun run test` (full suite) green, no regression vs. the pre-existing test count. Automatically verifiable → commit here. (One known pre-existing flake reproduced: `bulk-create-publish.service.spec.ts`'s 1ms timestamp comparison, same one documented in `docs/documents/swagger.md` — unrelated to this change, retried and passed.)

### Phase 3 — Docs
- [ ] `.env.example` — add a comment above the blank `CORS_ORIGINS=` line: comma-separated exact origins, no wildcards, example `http://localhost:3000`
- [ ] `docs/documents/cors.md` (new) — the two policies, the single-delegate mechanism and why (summarizing the techstack doc), the `/health` fallthrough note, the `CORS_ORIGINS` contract
- [ ] `docs/ENTRYPOINT.md` — add one bullet for `docs/documents/cors.md`, matching existing entry style
- [ ] `docs/cms-admin-integration.md` — §1: replace the "CORS is not configured" paragraph with the real policy + how to get an origin added; §7: remove the now-resolved "CORS is not configured" bullet from "Known gaps"
- [ ] **Checkpoint 3:** doc read-through — no section still says CORS is unconfigured; automated checks (`bun run lint && bun run build && bun test`) unchanged from Checkpoint 2 — commit.

### Phase 4 — Five-axis code review (Opus) + fixes + `SPEC.md` trim + close-out
- [ ] **Run the review on Opus** — `[CAREFUL]` mandates Opus for the Review phase; switch to / invoke Opus for this step (e.g. `agent-skills:code-reviewer`)
- [ ] Five-axis review (correctness / readability / architecture / security / performance) — pay special attention to: no path where the strict-allowlist branch and the open/public branch can both apply to the same request; `credentials: false` always paired with the open-origin branch; no accidental wildcard default if `CORS_ORIGINS` parsing yields an empty array
- [ ] Fix any Important/correctness findings; re-verify `bun run build && bun run lint && bun test`; record findings + resolutions inline at this checkpoint
- [ ] `SPEC.md` — trim back to a one-line pointer at `docs/documents/cors.md` (+ techstack doc), per the "Root docs" rule; delete `specs/cors.md`
- [ ] **Checkpoint 4 (final):** all automated checks green after any review fixes; `SPEC.md` reduced to the pointer — commit.

### Phase 5 — Manual verification (non-blocking for earlier commits; user-performed)
- [ ] User runs `bun run start:dev` and confirms real headers: `curl -H "Origin: <an allowed CORS_ORIGINS value>" -I http://localhost:8080/api/v1/permissions` shows `Access-Control-Allow-Origin` + `Access-Control-Allow-Credentials: true`; `curl -H "Origin: http://anything.example.com" -I http://localhost:8080/api/v1/public/documents/single-type/x` shows a reflected `Access-Control-Allow-Origin` and no `Access-Control-Allow-Credentials` header
- [ ] Tracked as outstanding until the user confirms — required before the feature is declared fully done

## Verification (end-to-end)

1. `bun run lint && bun run build && bun test` (full suite) — all green, no regression in test count, use `bun run lint` (never raw `eslint`).
2. `CORS_ORIGINS` missing/empty fails app boot (env validation test).
3. Authenticated `/api/v1/*` requests from an allowlisted origin get credentialed CORS headers; from a non-allowlisted origin, they don't.
4. `/api/v1/public/documents/*` requests from any origin get a reflected `Access-Control-Allow-Origin` and never `Access-Control-Allow-Credentials: true`.
5. `docs/cms-admin-integration.md` no longer states CORS is unconfigured.
6. Manual (Phase 5, user-performed): curl smoke test against a running dev server confirming real headers on both surfaces.
