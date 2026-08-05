# Request lifecycle — income to outcome

Scope: how an inbound HTTP request travels through this API end to end — boot-time
wiring, middleware, guards, validation, controller → service → repository dispatch,
response shaping, and error handling. Read directly from `src/main.ts`,
`src/bootstrap/configure-app.ts`, `src/common/guards/*`, `src/app.controller.ts`, and
`src/config/env.validation.ts` — not inferred. Cross-referenced against
`docs/documents/cors.md` and `docs/documents/swagger.md` for narrative context only.

Key facts that shape the diagram: there are **no global** `APP_GUARD` / `APP_INTERCEPTOR`
/ `APP_FILTER` providers anywhere in `src` — every guard is attached per-route/per-controller
via `@UseGuards`, there is no response-transform interceptor, and there is no custom
exception filter. The only global pipeline elements are the `ValidationPipe`,
`cookie-parser` middleware, and the CORS delegate.

## Diagram A — boot-time wiring

```mermaid
flowchart TD
    A["NestFactory.create(AppModule)<br/>main.ts:8"] --> B["configureApp(app)<br/>configure-app.ts:76-99"]
    B --> C["1. query parser = extended<br/>configure-app.ts:80<br/>enables filters[field][$op]=value parsing"]
    C --> D["2. app.useGlobalPipes(ValidationPipe)<br/>whitelist + forbidNonWhitelisted + transform<br/>configure-app.ts:82"]
    D --> E["3. app.use(cookieParser())<br/>configure-app.ts:83"]
    E --> F{"SMTP_FORCE_IPV4_DNS set?"}
    F -- yes --> G["forceIpv4Dns()<br/>configure-app.ts:87-89"]
    F -- no --> H["4. app.set(trust proxy, TRUST_PROXY)<br/>configure-app.ts:91-92, default 1"]
    G --> H
    H --> I["5. configureCors(app, configService)<br/>configure-app.ts:94 -> app.enableCors(delegate)"]
    I --> J["6. app.setGlobalPrefix(api/v1, exclude: [health])<br/>configure-app.ts:96"]
    J --> K["7. configureSwagger(app)<br/>mounts /api-docs<br/>configure-app.ts:98"]
    K --> L["app.listen(PORT)<br/>main.ts:10"]
```

## Diagram B — per-request pipeline

```mermaid
sequenceDiagram
    participant C as Client
    participant CORS as CORS delegate
    participant CP as cookie-parser
    participant R as Nest Router
    participant G as Route Guards
    participant VP as ValidationPipe
    participant Ctl as Controller
    participant Svc as Application Service
    participant DB as Prisma transaction
    participant EF as Default exception filter

    C->>CORS: HTTP request
    alt path starts with /api/v1/public/documents/
        CORS-->>C: origin true, credentials false (open, non-credentialed)
    else everything else, incl. /health and /api-docs
        CORS-->>C: origin CORS_ORIGINS allowlist, credentials true (strict)
    end
    CORS->>CP: forward request
    CP->>R: parse access_token / refresh_token cookies
    R->>R: strip /api/v1 prefix, health excluded from prefix
    R->>G: dispatch to matched route

    alt route declares guards
        G->>G: evaluate guard(s) in declared order
        alt guard throws
            G-->>EF: 401 Unauthorized / 403 Forbidden / 429 rate limited
            EF-->>C: statusCode, message, error JSON
        else guard passes
            G->>VP: continue
        end
    else no guards, e.g. health, public documents, Swagger UI
        R->>VP: continue directly
    end

    VP->>VP: validate and transform DTO
    alt validation fails
        VP-->>EF: 400 BadRequestException
        EF-->>C: statusCode, message, error JSON
    else validation passes
        VP->>Ctl: invoke handler
    end

    Ctl->>Svc: delegate to application service
    Svc->>DB: repository calls inside prisma dollar-transaction
    alt unhandled error at any stage
        DB-->>EF: thrown error
        EF-->>C: default JSON error, 500 unless a known HttpException
    else success
        DB-->>Svc: persisted or queried data
        Svc-->>Ctl: domain result
        Ctl->>Ctl: resolveUpdatedBy(userId) on authenticated routes, then toDocumentResponse mapper
        Ctl-->>C: 2xx JSON response
    end
```

## Notes / branch summary

- `/health` bypasses the global prefix and has no guards (`app.controller.ts:5-8`) but still
  passes through CORS + cookie-parser (Express-level middleware, ahead of routing).
- `/api-docs` (Swagger UI) and `/graphql` (Apollo, its own `context()` / `formatError`) are
  the two routes that run outside this per-route-guard pipeline — GraphQL has its own
  parallel auth/error pipeline, see `graphql-query-flow-diagram.md`.
- `ApiTokenGuard` (`api-token.guard.ts`) is defined and exported but never attached via
  `@UseGuards` anywhere — Bearer-token REST auth actually flows through `JwtAuthGuard`'s
  multi-strategy fallback, see `auth-api-token-flow-diagram.md`.
- No custom `@Catch()` exception filter exists in `src` — every thrown `HttpException`
  (and any uncaught error) falls through to Nest's built-in default filter, producing
  `{ statusCode, message, error }`. There is no app-specific error envelope.
- No `helmet` and no global body-parser call — Express's bundled JSON/urlencoded parsing
  (via `NestExpressApplication`) is what is active; rate limiting is a per-route guard
  (`RateLimitGuard`), not global middleware.

Sources read: `src/main.ts`, `src/bootstrap/configure-app.ts`, `src/common/guards/*`,
`src/app.controller.ts`, `src/config/env.validation.ts`.
