# CORS

Real CORS handling for the whole app, wired via a single `app.enableCors()` call in
`src/bootstrap/configure-app.ts`'s `configureCors(app, configService)`, called from `configureApp` right after
`app.set("trust proxy", ...)`. See [bootstrap-cors-techstack.md](./bootstrap-cors-techstack.md) for the decision
rationale (why one delegate instead of two `cors` middlewares).

## Two policies, one delegate

| Surface | Origin policy | Credentials |
| --- | --- | --- |
| `/api/v1/*` (everything except public documents) | Strict allowlist from `CORS_ORIGINS` env var, exact match | `true` |
| `/api/v1/public/documents/*` (single-type & collection-type public reads) | Any origin (`origin: true`) | `false` |
| `/health` (unprefixed) | Falls into the strict-allowlist branch by default — harmless, see below | n/a |

`configureCors` builds one CORS delegate that branches per-request on `req.path.startsWith("/api/v1/public/documents/")`:

- **Public documents branch** — `{ origin: true, credentials: false }`. Any origin gets a reflected
  `Access-Control-Allow-Origin`, but `Access-Control-Allow-Credentials` is never set — these routes carry no
  session, so open CORS here can't leak authenticated data.
- **Everything else** — `{ origin: parseCorsOrigins(CORS_ORIGINS), credentials: true }`. Only an exact-match
  origin from the allowlist gets `Access-Control-Allow-Origin` + `Access-Control-Allow-Credentials: true`; every
  other origin gets neither header, so the browser blocks the response from being read.

Because both branches return one fully-formed options object per request, no request can end up with both an
open/reflected origin **and** `Access-Control-Allow-Credentials: true` — the classic CORS+credentials
vulnerability this feature exists to avoid.

## `/health` fallthrough

`/health` is unprefixed (`app.setGlobalPrefix("api/v1", { exclude: ["health"] })`) but still passes through the
same global CORS middleware, and doesn't match the public-documents prefix, so it falls into the strict-allowlist
branch by default. This is a deliberate, understood fallthrough, not an oversight: `/health` is
server-to-server/monitoring traffic, never fetched from a browser with credentials.

## Path matching uses the raw, prefixed path

`setGlobalPrefix("api/v1")` only rewrites controller route strings at Nest bootstrap — CORS runs as Express
middleware ahead of the Nest router, so the delegate always sees the real incoming path. The public-documents
match is therefore `/api/v1/public/documents/` (not `/public/documents/`).

## `CORS_ORIGINS` env var

Required, no default — validated in `src/config/env.validation.ts` (`@IsString() @MinLength(1)`), matching the
existing fail-closed pattern for `JWT_ACCESS_SECRET`/`COOKIE_SAMESITE`. Format: comma-separated exact origins, no
wildcards, no regex, e.g. `CORS_ORIGINS=http://localhost:3000,https://admin.example.com`. Parsed into a `string[]`
by the pure `parseCorsOrigins` helper (comma-split, trim, drop empty segments) alongside `configure-app.ts`'s
existing `parseTrustProxy`.

## Testing

`src/bootstrap/configure-app.spec.ts` covers `parseCorsOrigins` standalone (single origin; multiple with
whitespace; trailing comma) and, via a synthesized `QueryEchoController`/`PublicDocumentsEchoController` pair
mounted with a real bootstrapped Nest app: an allowed origin on `/api/v1/*` gets credentialed headers, a
disallowed origin gets neither header, `/api/v1/public/documents/*` reflects any origin with no credentials
header, and an `OPTIONS` preflight from an allowed origin returns 2xx with the right headers.
