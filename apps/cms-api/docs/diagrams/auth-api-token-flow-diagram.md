# Auth flow — API token (Bearer)

Scope: how a request carrying `Authorization: Bearer <token>` is authenticated. There
are **two independent implementations** in this codebase, plus one dead class — this
diagram shows all three so the diagram matches what actually runs. Read directly from
`src/common/strategies/api-token.strategy.ts`, `src/modules/access-tokens/**`,
`src/modules/graphql/infrastructure/graphql-context.factory.ts`, and
`src/modules/graphql/**/authorize.util.ts` — not inferred. Cross-referenced against
`docs/documents/access-tokens.md` and `docs/documents/graphql.md` for narrative context
only.

## Diagram A — REST path (wired, via JwtAuthGuard fallback)

```mermaid
sequenceDiagram
    participant C as Client
    participant Guard as JwtAuthGuard
    participant AS as ApiTokenStrategy
    participant Repo as IAccessTokenRepository
    participant Perm as PermissionsGuard
    participant Ctl as Route handler

    C->>Guard: request with Authorization Bearer token
    Guard->>Guard: "jwt" strategy fails, token doesn't verify as a JWT
    Guard->>AS: fall back to "api-token" strategy, passport-http-bearer
    AS->>AS: extract Bearer token from Authorization header
    AS->>AS: hash token with SHA-256
    AS->>Repo: findByTokenHash(hash)
    alt not found
        AS-->>C: 401 Invalid API Token
    else found
        AS->>AS: check record.expiresAt against now
        alt expired
            AS-->>C: 401 Api Token Expired
        else valid
            AS-->>Guard: req.user = sub: record.updatedBy, permissions: record.permissions
            Note over AS: shape lacks roleSlug/level present in the JWT payload —<br/>a minor type mismatch since both strategies feed the same req.user
        end
    end

    Guard->>Perm: continue if authenticated
    Perm->>Perm: same permission check as auth-jwt-flow-diagram.md
    Perm->>Ctl: pass through or 403 Insufficient permissions
```

## Diagram B — GraphQL path (separate manual reimplementation)

```mermaid
sequenceDiagram
    participant C as GraphQL client
    participant CF as GraphqlContextFactory
    participant Repo as IAccessTokenRepository
    participant Res as Resolver
    participant Auth as assertApiTokenPermission

    C->>CF: POST /graphql, Authorization Bearer token
    CF->>CF: strip Bearer prefix
    CF->>CF: hash token with SHA-256, same algorithm as ApiTokenStrategy
    CF->>Repo: findByTokenHash(hash)
    alt not found, expired, or header missing
        CF-->>Res: context.apiToken = null
        Note over CF: never throws here — failure is deferred to the resolver
    else valid
        CF-->>Res: context.apiToken = documentId, name, permissions
    end

    Res->>Auth: assertApiTokenPermission(context, requiredSlug)
    alt context.apiToken is null
        Auth-->>C: GraphQLError, UNAUTHENTICATED
    else missing required permission slug
        Auth-->>C: GraphQLError, FORBIDDEN
    else authorized
        Auth->>Res: continue to field resolution
    end
```

## Diagram C — the unwired standalone class

```mermaid
flowchart LR
    A["ApiTokenGuard class<br/>api-token.guard.ts"] -->|"provided/exported by AccessTokenModule"| B["never referenced in any\n@UseGuards() call anywhere in src"]
    B --> C["dead code —\nsame Bearer/SHA-256/findByTokenHash/expiry logic\nas Diagram A, but populates req.apiToken\ninstead of req.user"]
```

## Notes

- REST Bearer auth is handled by `ApiTokenStrategy` through `JwtAuthGuard`'s multi-strategy
  fallback — **not** by the standalone `ApiTokenGuard` class, despite the name similarity.
- GraphQL cannot use `@UseGuards()` at all because Apollo's `context()` factory is not a
  Nest route — so it reimplements the same hash/lookup/expiry logic inline rather than
  reusing either guard class.
- Token issuance: `CreateAccessTokenService` generates `cms_<64 hex chars>` via
  `randomBytes(32)`, stores only the SHA-256 hash, and returns the plaintext token exactly
  once — it is never retrievable again. No rotation mechanism exists.

Sources read: `src/common/strategies/api-token.strategy.ts`,
`src/modules/access-tokens/infrastructure/api-token.guard.ts`,
`src/modules/access-tokens/access-token.module.ts`,
`src/modules/graphql/infrastructure/graphql-context.factory.ts`,
`src/modules/graphql/**/authorize.util.ts`,
`src/modules/access-tokens/application/services/create-access-token.service.ts`.
