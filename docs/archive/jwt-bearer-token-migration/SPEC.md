# Spec: JWT Access Token — Cookie → `Authorization: Bearer` Header

## Objective

Today `POST /auth/login` and `POST /auth/refresh` set the JWT **access token** as an httpOnly
`access_token` cookie. This spec moves the access token out of cookies: it is returned as a field
in the login/refresh JSON response body, held **in memory** by the `cms-admin` frontend, and sent
back on every subsequent request as an `Authorization: Bearer <token>` header.

**Unchanged:** the **refresh token** stays exactly as it is today — a server-set httpOnly,
`secure`, `sameSite` cookie, verified by the existing `JwtRefreshStrategy`/`JwtRefreshGuard`, never
touched by JS. Only the access token's transport changes.

**Why:** enables non-browser/cross-site API consumers (and simplifies CORS/cookie handling for the
access-token half of the flow) without giving up httpOnly protection for the long-lived refresh
token — an XSS can steal at most a 15-minute access token, never the 7d/30d refresh token.

**Users:** `cms-admin` (the first-party SPA) is the only current consumer of the cookie-session
flow; the API-token (`Authorization: Bearer cms_<hex>`, long-lived, DB-backed) strategy used by
third-party integrations is a separate, unrelated mechanism that must keep working unchanged.

**Success looks like:** `cms-admin` logs in, stores the access token in memory only (never
`localStorage`/`sessionStorage`), attaches it to every API call, transparently refreshes on 401 via
the still-cookie-based refresh flow, and no code path anywhere still reads/writes an `access_token`
cookie.

## Conflict Analysis — the part this spec exists to resolve

`JwtAuthGuard = AuthGuard(["jwt", "api-token"])` already combines two Passport strategies behind
one guard, used across ~9 controllers:

- `jwt` (`JwtStrategy`) — today reads `req.cookies.access_token`. **This spec changes its
  extractor to `ExtractJwt.fromAuthHeaderAsBearerToken()`.**
- `api-token` (`ApiTokenStrategy`, `passport-http-bearer`) — already reads
  `Authorization: Bearer <token>`, hashes it, looks it up in the `access_tokens` table. Unchanged.

Once both strategies read the same header, is there a collision? **No**, verified two ways:

1. **Format never overlaps.** API tokens are opaque strings `cms_<64 hex chars>`
   (`generateAccessTokenSecret`) — no dots, not JWT-shaped. A real JWT is always three
   dot-separated base64url segments. `jsonwebtoken.verify()` throws `JsonWebTokenError: jwt
   malformed` on anything that isn't dot-segmented.
2. **Passport's array-strategy fallback is sequential-on-fail, not parallel.** `@nestjs/passport`'s
   `AuthGuard(type)` calls `passport.authenticate(type, ...)` with `type` as the array as-is;
   Passport tries `"jwt"` first — on a malformed-JWT failure `passport-jwt` calls `fail()`, not
   `error()`, so Passport falls through to `"api-token"` next. Confirmed by reading
   `node_modules/@nestjs/passport/dist/auth.guard.js`.

**Conclusion:** no guard/strategy logic changes are needed beyond moving `JwtStrategy`'s extractor
to the header. **Strategy order `["jwt", "api-token"]` becomes load-bearing** and must not be
reordered — a comment should note this at the guard definition.

`JwtRefreshGuard = AuthGuard(["jwt-refresh"])` is untouched — separate strategy, separate cookie,
no shared header, no interaction with this change.

`GraphqlContextFactory` already does its own manual Bearer-header parsing for API-token-only GraphQL
auth (no JWT support there today) — out of scope, unaffected.

## Tech Stack

- Backend: NestJS, `@nestjs/passport`, `passport-jwt`, `passport-http-bearer`, `@nestjs/jwt`,
  `@nestjs/swagger` — `apps/cms-api`.
- Frontend: React SPA, Axios — `apps/cms-admin`.

## Commands

```
# Backend (apps/cms-api)
Build: bun run build
Test:  bun run test
Lint:  bun run lint
Dev:   bun run dev

# Frontend (apps/cms-admin)
Build: bun run build
Test:  bun run test
Lint:  bun run lint
Dev:   bun run dev
```

## Project Structure — files this change touches

### Backend (`apps/cms-api/src`)

```
common/strategies/jwt.strategy.ts              → extractor: cookie → Authorization Bearer header
common/strategies/jwt.strategy.spec.ts          → update tests for new extractor
common/guards/jwt-auth.guard.ts                 → no logic change; add order-is-load-bearing comment
modules/auth/presentation/auth.controller.ts    → login/refresh: stop setting access_token cookie,
                                                   return accessToken in response body; logout: stop
                                                   clearing access_token cookie; @ApiCookieAuth() →
                                                   @ApiBearerAuth() on `me`
modules/auth/presentation/dto/auth-response.dto.ts → add accessToken field to login/refresh response DTOs
modules/auth/presentation/auth.controller.spec.ts  → update expectations
bootstrap/configure-app.ts                      → Swagger: drop addCookieAuth("access_token", ...),
                                                   keep addBearerAuth()
Every other controller using @ApiCookieAuth():
  modules/content-type/presentation/content-type.controller.ts
  modules/access-tokens/presentation/access-token.controller.ts
  modules/roles/presentation/role.controller.ts
  modules/document/presentation/collection-type-document.controller.ts
  modules/document/presentation/single-type-document.controller.ts
  modules/permissions/presentation/permission.controller.ts
  modules/users/presentation/user.controller.ts
  modules/media/presentation/media.controller.ts
                                                 → @ApiCookieAuth() → @ApiBearerAuth()
docs/documents/auth.md                          → narrative update: access token transport
docs/diagrams/login-flow-diagram.md             → update: response body + header, not cookie
docs/diagrams/refresh-token-flow-diagram.md     → update: refresh sets accessToken in body only;
                                                   refresh_token cookie unchanged
docs/diagrams/auth-jwt-flow-diagram.md          → update: extractor reads Authorization header
```

### Frontend (`apps/cms-admin/src`)

```
lib/api.ts                          → in-memory access-token holder (module-level variable, not
                                       React state — survives re-renders, cleared on logout/reload
                                       by design); Axios request interceptor attaches
                                       `Authorization: Bearer <token>`; keep withCredentials: true
                                       (still required for the refresh_token cookie); update the
                                       401 interceptor to capture the new accessToken from the
                                       refresh response and store it before retrying
context/AuthContext.tsx             → hold accessToken (or delegate to lib/api.ts's holder); login()
                                       and the mount-time refresh both capture accessToken from the
                                       response body
pages/auth/LoginPage.tsx            → capture accessToken from POST /auth/login response, hand to
                                       AuthContext/api client
lib/__tests__/api.test.ts           → update interceptor tests for header attachment + refresh capture
context/__tests__/AuthContext.test.tsx → update for token-in-memory state
```

## Code Style

Backend — one example of the target shape for `JwtStrategy`'s extractor (mirrors the existing
`jwtCookieExtractor` being replaced):

```typescript
import { ExtractJwt } from "passport-jwt";

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, "jwt") {
  constructor(configService: ConfigService<EnvironmentVariables, true>) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get("JWT_ACCESS_SECRET", { infer: true }),
    } satisfies StrategyOptions);
  }

  validate(payload: AccessTokenPayload): AccessTokenPayload {
    return payload;
  }
}
```

Frontend — in-memory token holder pattern for `lib/api.ts` (module scope, not `localStorage`):

```typescript
let accessToken: string | null = null;
export function setAccessToken(token: string | null): void {
  accessToken = token;
}

api.interceptors.request.use((config) => {
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});
```

Follow each repo's existing conventions otherwise (import grouping, DTO/decorator patterns already
visible in the files listed above) — no new patterns introduced beyond what's shown here.

## Testing Strategy

- **Backend unit**: `jwt.strategy.spec.ts` — asserts the extractor reads
  `Authorization: Bearer <token>` and no longer reads `req.cookies`. `auth.controller.spec.ts` —
  asserts `login`/`refresh` responses include `accessToken` in the body and no longer call
  `res.cookie(ACCESS_TOKEN_COOKIE, ...)`; `logout` no longer calls
  `res.clearCookie(ACCESS_TOKEN_COOKIE)`.
- **Backend integration** (if an e2e/supertest suite exists for auth): full login → protected-route
  call using the returned `accessToken` as a Bearer header → refresh → confirm rotated token works,
  old one still valid until natural expiry (no revocation, matches existing refresh-token behavior).
- **Backend — conflict regression**: an explicit test asserting a request with
  `Authorization: Bearer cms_<validApiToken>` still authenticates via the `api-token` strategy (not
  broken by the `jwt` strategy now sharing the header) — this is the one behavior this spec must not
  regress.
- **Frontend unit**: `api.test.ts` — interceptor attaches `Authorization` header when a token is
  held, omits it when not; 401-refresh-retry flow captures the new token from the refresh response
  before retrying. `AuthContext.test.tsx` — token state lifecycle (set on login/refresh, cleared on
  logout).
- Run both suites' existing lint/test commands (see Commands) before considering any task done —
  per this project's `bun run lint` (never raw `bunx eslint .`, see `feedback_cpu_intensive_commands`
  memory).

## Boundaries

- **Always do:** keep the refresh token httpOnly/cookie-only (never expose it to JS); keep the
  access token out of any persistent client storage (`localStorage`/`sessionStorage`) — in-memory
  only, per the explicit ask; preserve `["jwt", "api-token"]` strategy order; run lint/tests before
  each commit; update Swagger decorators (`@ApiCookieAuth` → `@ApiBearerAuth`) everywhere the token
  type changed.
- **Ask first:** any change to `JWT_ACCESS_SECRET`/TTL values, any change to CORS/`credentials`
  config, any change to the API-token (`api-token` strategy / `access_tokens` table) mechanism
  itself, any decision to also change refresh-token transport (explicitly out of scope per this
  spec).
- **Never do:** store the access token in `localStorage`, `sessionStorage`, or a non-httpOnly
  cookie; log the raw access or refresh token value; remove or weaken the existing API-token
  strategy while wiring this in; commit `.env*` files.

## Success Criteria

- [ ] `POST /auth/login` response body includes `accessToken`; no `access_token` cookie is set.
- [ ] `POST /auth/refresh` response body includes a rotated `accessToken`; `refresh_token` cookie
      behavior is unchanged (still set, still httpOnly, same rotation semantics).
- [ ] `POST /auth/logout` still clears `refresh_token`; no longer attempts to clear `access_token`.
- [ ] Any request to a `JwtAuthGuard`-protected route with a valid `Authorization: Bearer <jwt>`
      succeeds; the same route with `Authorization: Bearer cms_<validApiToken>` still succeeds
      (conflict-regression test passes).
- [ ] `cms-admin` never touches `access_token` cookies; access token lives only in an in-memory
      holder, is attached via an Axios request interceptor, and is refreshed transparently on 401.
- [ ] All `@ApiCookieAuth()` occurrences tied to the access token are replaced with
      `@ApiBearerAuth()`; Swagger UI reflects Bearer auth, not cookie auth, for these routes.
- [ ] `docs/documents/auth.md` and the three `docs/diagrams/*.md` files no longer describe an
      access-token cookie.
- [ ] `bun run lint` and `bun run test` pass in both `apps/cms-api` and `apps/cms-admin`.

## Open Questions

None outstanding — all three ambiguous points (refresh-token transport, frontend scope, docs scope)
were resolved with the user before this spec was written.
