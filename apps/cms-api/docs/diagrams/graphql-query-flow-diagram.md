# GraphQL — query execution flow

Scope: how a single `POST /graphql` request is authenticated, dispatched to a resolver,
and turned into a response — including media-field DataLoader batching and error
formatting. Read directly from `src/modules/graphql/**` — not inferred. Cross-referenced
against `docs/documents/graphql.md` for narrative context only. See
`graphql-schema-generation-flow-diagram.md` for how the resolvers were built, and
`auth-api-token-flow-diagram.md` Diagram B for the auth sub-flow reused here.

## Diagram — single query/mutation execution

```mermaid
sequenceDiagram
    participant C as GraphQL client
    participant Apollo as ApolloDriver, POST /graphql
    participant CF as GraphqlContextFactory
    participant Res as generated resolver closure
    participant Auth as assertApiTokenPermission
    participant Loader as per-request DataLoader
    participant Svc as document/content-type/media service
    participant FE as formatGraphqlError

    C->>Apollo: POST /graphql, query + Authorization Bearer token
    Apollo->>CF: context({ req })
    CF->>CF: verify Bearer token, see auth-api-token-flow-diagram.md Diagram B
    CF-->>Apollo: context.apiToken = payload or null, plus a fresh mediaAssetLoader
    Note over CF,Loader: DataLoader instance is built fresh per request,\nnever shared or cached across requests

    Apollo->>Res: dispatch matched Query/Mutation field
    Res->>Res: assertValidDocumentId, isUUID check
    alt invalid documentId
        Res-->>FE: BAD_USER_INPUT
    else valid
        Res->>Auth: assertApiTokenPermission(context, requiredSlug)
        alt context.apiToken is null
            Auth-->>FE: UNAUTHENTICATED
        else missing permission slug
            Auth-->>FE: FORBIDDEN
        else authorized
            Res->>Svc: delegate directly to existing document/content-type/media\nusecase, e.g. GetPublicDocumentService, SaveDocumentService
            Note over Res,Svc: zero business logic in the resolver body itself —\nguard, delegate, and map the result, nothing else

            opt list query resolving a media-typed field
                Svc-->>Res: rows containing media foreign keys
                Res->>Loader: mediaAssetLoader.load(fk) per row
                Loader->>Loader: batch fn calls mediaAssets.findByDocumentIds([...ids])\nonce per execution tick
                Loader-->>Res: media asset or null per key, in key order
            end

            Svc-->>Res: domain result
            Res-->>C: toResolverValue / withErrorMapping shaped response
        end
    end

    alt any error thrown along the way
        FE->>FE: check extensions.code against SAFE_ERROR_CODES allowlist\nUNAUTHENTICATED, FORBIDDEN, BAD_USER_INPUT, NOT_FOUND,\nplus graphql-js/Apollo parse/validation/introspection codes
        alt code is whitelisted
            FE-->>C: original code and message
        else code not whitelisted
            FE-->>C: INTERNAL_SERVER_ERROR, generic Internal server error,\nmessage detail dropped
        end
    end
```

## Notes

- Auth cannot use `@UseGuards()` here since Apollo's `context()` factory is not a Nest
  route — `GraphqlContextFactory` reimplements the Bearer/SHA-256/lookup/expiry logic
  inline rather than invoking `ApiTokenGuard`, and it never throws — failure just yields
  `apiToken: null`, deferring the actual 401/403 decision to each resolver.
- The DataLoader batches media-field resolution specifically (fixed for the N+1 case on
  list queries); it does not batch `ListDocumentsFullService`'s own component/media
  row-hydration, which remains a documented, accepted N+1.
- Introspection and the GraphQL Playground are both gated on
  `process.env.NODE_ENV !== "production"` — a deny-list that fails open if `NODE_ENV` is
  unset, a deliberate trade-off per `docs/documents/graphql.md`.

Sources read: `src/modules/graphql/graphql.module.ts`,
`src/modules/graphql/infrastructure/graphql-context.factory.ts`,
`src/modules/graphql/application/resolver-factory.service.ts`,
`src/modules/graphql/**/authorize.util.ts`,
`src/modules/graphql/**/format-error.util.ts`.
