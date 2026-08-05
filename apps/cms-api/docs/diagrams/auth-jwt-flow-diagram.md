# Auth flow — JWT (cookie-based)

Scope: how a subsequent, already-logged-in request is authenticated and authorized via
the `access_token` cookie. Read directly from `src/common/guards/jwt-auth.guard.ts`,
`src/common/strategies/jwt.strategy.ts`, `src/common/guards/permissions.guard.ts` — not
inferred. Cross-referenced against `docs/documents/auth.md` for narrative context only.
See `login-flow-diagram.md` for how the cookie is first issued.

## Diagram — JWT verification sequence

```mermaid
sequenceDiagram
    participant C as Client
    participant Guard as JwtAuthGuard
    participant JS as JwtStrategy
    participant Perm as PermissionsGuard
    participant Ctl as Route handler

    C->>Guard: request with access_token cookie
    Guard->>JS: try strategy "jwt" first
    JS->>JS: jwtCookieExtractor reads req.cookies.access_token
    alt cookie missing or empty or non-string
        JS-->>Guard: no token, Passport info = No auth token
        Guard-->>C: 401 Missing access token
    else cookie present
        JS->>JS: verify signature and expiry against JWT_ACCESS_SECRET, ignoreExpiration false
        alt signature invalid or expired or malformed
            JS-->>Guard: verification failure
            Guard->>Guard: fall back to "api-token" strategy
            Note over Guard: see auth-api-token-flow-diagram.md
        else valid
            JS->>JS: validate(payload) is a pure pass-through, no DB hit
            JS-->>Guard: req.user = sub, roleSlug, level, permissions
        end
    end

    alt neither jwt nor api-token strategy produced a user
        Guard-->>C: 401 Invalid or expired access token
    else authenticated
        Guard->>Perm: continue, if route also declares PermissionsGuard
        alt PermissionsGuard applied
            Perm->>Perm: read required permissions via RequirePermissions metadata
            alt no permissions required
                Perm->>Ctl: pass through
            else permissions required
                Perm->>Perm: check req.user.permissions set,<br/>a manager permission also satisfies the equivalent read requirement
                alt insufficient
                    Perm-->>C: 403 Insufficient permissions
                else sufficient
                    Perm->>Ctl: pass through
                end
            end
        else no PermissionsGuard on this route
            Guard->>Ctl: pass through
        end
    end

    Ctl-->>C: handler executes with req.user populated
```

## Notes

- `JwtAuthGuard extends AuthGuard(["jwt", "api-token"])` — it is a single guard class that
  tries two Passport strategies in order, not two separate guards. This is why the failure
  path falls back to the API-token strategy before finally returning 401 — see
  `auth-api-token-flow-diagram.md` for that branch's detail.
- `PermissionsGuard` is always paired after `JwtAuthGuard` via
  `@UseGuards(JwtAuthGuard, PermissionsGuard)` on every protected controller.
- `JwtStrategy.validate` never hits the database — all authorization data (`roleSlug`,
  `level`, `permissions`) is carried inside the signed JWT payload itself.

Sources read: `src/common/guards/jwt-auth.guard.ts`, `src/common/strategies/jwt.strategy.ts`,
`src/common/guards/permissions.guard.ts`.
