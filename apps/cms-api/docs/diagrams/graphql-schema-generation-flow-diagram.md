# GraphQL — create schema flow

Scope: how the GraphQL SDL and resolvers are built once at boot, directly from
`content-types/*.json`, without touching the database. Read directly from
`src/modules/graphql/**` — not inferred. Cross-referenced against
`docs/documents/graphql.md` for narrative context only.

## Diagram — boot-time SDL/resolver build

```mermaid
flowchart TD
    Init["GraphqlModule.forRootAsync useFactory\nruns once at module init"] --> Timing{"why read disk,\nnot the database?"}
    Timing --> Race["ContentTypeSyncService.onApplicationBootstrap()\nreconciles content-types/*.json into Postgres\nAFTER this factory runs —\nreading the DB here would race an empty/stale\ncontent_types table on cold boot"]
    Race --> Loader["SchemaLoaderService.load()\nreads CONTENT_TYPES_DIR directly from disk"]

    Loader --> Build["SchemaBuilderService.buildTypeDefs()"]
    Build --> Split["split ContentTypeDefinition[] by kind:\ncollectionDefinitions / singleDefinitions"]

    Split --> Scalars["scalar stubs: MediaAsset, JSON, DateTime"]
    Split --> Objects["buildObjectType + buildComponentTypesFor\nper content type, recursing into nested components"]
    Split --> Inputs["input + component-input types\nper content type"]
    Split --> Shared["shared FILTER_INPUT_TYPES / ORDER_BY_TYPES / PAGINATION_TYPES"]
    Split --> PerType["per-collection <Type>Filter / <Type>OrderBy / <Type>List"]

    Split --> Coll{"kind == collection?"}
    Coll -- yes --> CQ["Query: <slug>(documentId, status): <Type>"]
    Coll -- yes --> CLQ["Query: pluralized list name(where, orderBy, pagination): <Type>List!\npluralization via listQueryName,\nes suffix for s/x/z/ch/sh endings, else s"]
    Coll -- yes --> CM["Mutation: create/update/delete/publish/unpublish\nall keyed on documentId: ID!"]

    Coll -- no, single --> SQ["Query: <slug>(status): <Type>, no documentId"]
    Coll -- no, single --> SM["Mutation: save<Type>/publish<Type>/unpublish<Type>\nno id argument at all"]

    Scalars --> SDL["assembled SDL string"]
    Objects --> SDL
    Inputs --> SDL
    Shared --> SDL
    PerType --> SDL
    CQ --> SDL
    CLQ --> SDL
    CM --> SDL
    SQ --> SDL
    SM --> SDL

    Loader --> Resolvers["ResolverFactoryService.buildResolvers()\niterates the identical\ncollectionDefinitions/singleDefinitions split, once"]
    Resolvers --> Wire["Apollo driver wired with SDL + resolver map"]
    SDL --> Wire
```

## Notes

- Both `SchemaBuilderService` and `ResolverFactoryService` call `SchemaLoaderService.load()`
  independently — the generated schema is a snapshot of disk at boot, not the live database.
- Collection-type and single-type shapes diverge specifically on the presence of
  `documentId`: collection mutations/queries are always keyed on it, single-type ones never
  take it since there is exactly one row per single type.

Sources read: `src/modules/graphql/graphql.module.ts`,
`src/modules/graphql/application/schema-builder.service.ts`,
`src/modules/graphql/application/resolver-factory.service.ts`,
`src/modules/graphql/application/naming.ts`,
`src/modules/content-type/application/schema/schema-loader.service.ts`.
