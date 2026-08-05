# Login flow

Scope: `POST /auth/login`, from request to Set-Cookie response. Read directly from
`src/modules/auth/**` (all layers) and `src/common/guards/*` — not inferred.
Cross-referenced against `docs/documents/auth.md` for narrative context only.

## Diagram — login sequence

```mermaid
sequenceDiagram
    participant C as Client
    participant RL as RateLimitGuard
    participant LS as LocalStrategy
    participant U as IUserRepository
    participant R as IRoleRepository
    participant Ctl as AuthController
    participant Login as LoginService
    participant JWT as JwtTokenService

    C->>RL: POST auth/login, email, password, rememberMe optional
    alt rate limit exceeded, per ip:handler bucket
        RL-->>C: 429 HttpException
    else within limit
        RL->>LS: continue, AuthGuard local
    end

    LS->>LS: manual shape check on email/password
    Note over LS: guards run before the global ValidationPipe,<br/>so LocalStrategy does its own typeof check
    alt malformed body
        LS-->>C: 400 BadRequestException
    end

    LS->>U: findByEmail(email)
    alt user not found
        LS->>LS: bcrypt.compare(password, precomputed dummy hash)
        Note over LS: timing-parity dummy compare, never short-circuits early
        LS-->>C: 401 Invalid email or password
    else user found
        LS->>LS: bcrypt.compare(password, user.password), bcryptjs not Bun.password
        alt password mismatch
            LS-->>C: 401 Invalid email or password
        else match
            LS->>LS: check user.verified
            alt not verified
                LS-->>C: 403 Email not verified
            else verified
                LS->>LS: check user.roleId present
                alt no role assigned
                    LS-->>C: 401 Unauthorized
                else has role
                    LS->>R: findById(user.roleId)
                    R-->>LS: role
                    LS-->>Ctl: req.user = user plus role
                end
            end
        end
    end

    Ctl->>Login: execute(req.user, dto.rememberMe)
    Login->>JWT: sign access token, sub/roleSlug/level/permissions, 15m TTL, JWT_ACCESS_SECRET
    Login->>JWT: sign refresh token, sub/rememberMe, 7d or 30d TTL, JWT_REFRESH_SECRET
    JWT-->>Login: access token, refresh token, refreshTokenMaxAgeMs
    Login-->>Ctl: tokens

    Ctl->>C: Set-Cookie access_token, httpOnly, secure, sameSite, maxAge 15m
    Ctl->>C: Set-Cookie refresh_token, same flags, maxAge refreshTokenMaxAgeMs
    Ctl-->>C: 200, message Login successful
```

## Diagram — where login sits among auth endpoints

```mermaid
flowchart LR
    Reg["POST /auth/register<br/>creates unverified user, emails OTP"] --> Verify["POST /auth/verify-otp<br/>verifies email, first-user role assignment"]
    Verify --> Login["POST /auth/login<br/>this diagram"]
    Login --> Me["GET /auth/me<br/>JwtAuthGuard"]
    Login --> Refresh["POST /auth/refresh<br/>JwtRefreshGuard, reads refresh_token cookie,<br/>rotates both tokens"]
    Login --> Logout["POST /auth/logout<br/>clears both cookies"]
    Reg --> Forgot["POST /auth/forgot-password"]
    Forgot --> Reset["POST /auth/reset-password"]
```

## Notes

- Password hashing uses `bcryptjs` (pure JS) rather than `Bun.password`, because the test
  suite runs under Jest/Node where `Bun` is `undefined` even though the app itself runs on
  Bun (`docs/documents/auth.md`).
- `verify-otp` is a one-time email-verification/first-user role-assignment step, not part of
  the login request itself.
- Cookie names: `access_token` (const in `jwt-auth.guard.ts`), `refresh_token` (const in
  `jwt-refresh.guard.ts`); flags come from `COOKIE_SECURE` / `COOKIE_SAMESITE` env vars.

Sources read: `src/modules/auth/presentation/auth.controller.ts`,
`src/common/strategies/local.strategy.ts`,
`src/modules/auth/application/services/login.service.ts`,
`src/common/token/jwt-token.service.ts`, `src/common/guards/rate-limit.guard.ts`,
`src/common/guards/jwt-auth.guard.ts`, `src/common/guards/jwt-refresh.guard.ts`.
