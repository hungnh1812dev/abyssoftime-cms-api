# Document flow — create / update / delete / publish / unpublish / bulk* / duplicate

Scope: the full document lifecycle for a collection-type, including the draft/publish
Mode A/B split, bulk operations, duplicate, and how REST surfaces (single-type,
collection-type, public) differ. Read directly from `src/modules/document/**` — not
inferred. Cross-referenced against `docs/documents/document.md` for narrative context
only. There is no "clone" endpoint anywhere in this module — only "duplicate" — confirmed
by source search, not assumed.

## Diagram A — create

```mermaid
sequenceDiagram
    participant C as Client
    participant Ctl as CollectionTypeDocumentController
    participant Svc as SaveDocumentService
    participant Policy as draft-publish.policy
    participant Comp as ComponentIoService
    participant DB as Prisma transaction

    C->>Ctl: POST documents/collection-type/:slug, { data }
    Note over Ctl: SaveDocumentDto only enforces @IsObject data —\nno per-field validation at the DTO layer,\nreal validation happens via the schema's SQL column types
    Ctl->>Svc: execute(slug, data, userId)
    Svc->>Policy: resolveSaveVersion(contentType)
    Policy->>Policy: assert kind == collection
    Policy-->>Svc: draftToPublish ? draft : published
    Svc->>Svc: generate randomUUID() documentId
    Svc->>DB: begin transaction
    DB->>DB: documents.upsert(...)
    DB->>Comp: saveComponentTree(fields)
    Comp->>Comp: recurse into field.fields, no coded depth limit\n(3-level nesting is a fact about the seed schemas,\nnot an enforced max, exercised only by tests)
    DB-->>Svc: commit
    Svc-->>Ctl: DocumentEntity
    Ctl->>Ctl: resolveUpdatedBy(userId)
    Ctl-->>C: 201, toDocumentResponse
```

## Diagram B — update

```mermaid
flowchart LR
    A["PUT :slug/:documentId"] --> B["same SaveDocumentService.execute,\nwith existing documentId"]
    B --> C["existing.createdAt / createdBy preserved"]
    C --> D["ComponentIoService: full delete-then-insert\nreplace of every component row, per path"]
    D --> E["GetDocumentForEditService re-read afterward —\nstatus can legitimately flip to 'modified'"]
```

## Diagram C — publish / unpublish, Mode A vs Mode B

```mermaid
flowchart TD
    Start["resolveSaveVersion is the single Mode A/B branch point"] --> Mode{"content type's\ndraftToPublish flag"}

    Mode -- "true, Mode A" --> A1["draft and published are two separate rows"]
    A1 --> A2["PublishDocumentService.execute:\nread draft row + hydrate its components"]
    A2 --> A3["build a brand-new DocumentEntity for published,\npreserving existingPublished.createdAt across a republish"]
    A3 --> A4["upsert + re-save components as published —\ndraft row untouched"]
    A1 --> A5["UnpublishDocumentService.execute, Mode A only:\ndelete published row + its components in a transaction,\ndraft untouched, 404 if no published row"]

    Mode -- "false, Mode B" --> B1["every save already writes directly\nto the published version —\nresolveSaveVersion always returns published"]
    B1 --> B2["assertDraftPublishEnabled throws 400\non any publish/unpublish call —\nthere is no separate draft to promote,\nit's an in-place, always-live row"]
```

## Diagram D — delete

```mermaid
flowchart LR
    A["DELETE :slug/:documentId"] --> B["DeleteDocumentService.execute"]
    B --> C["fetch draft and published in parallel"]
    C --> D{"both absent?"}
    D -- yes --> E["404"]
    D -- no --> F["delete both versions' components\nand both document rows, one transaction"]
    F --> G["accepts an optional external tx —\nreused by the bulk-delete case"]
```

## Diagram E — bulk create + publish, bulk delete

```mermaid
flowchart TD
    Route["POST/DELETE :slug/bulk"] --> Order["declared BEFORE any :documentId route\nin the controller"]
    Order --> Comment["explicit code comment:\nboth /bulk routes must be declared before /:documentId,\nor Nest captures 'bulk' as the :documentId param"]

    Comment --> BCP["BulkCreateAndPublishService.execute"]
    BCP --> Chunk["processes in CHUNK_SIZE = 5 concurrent chunks"]
    Chunk --> Fail{"any item fails?"}
    Fail -- yes --> Rollback["compensating deletes:\nevery successfully-created doc so far\n(prior chunks + same-chunk successes) is rolled back\nvia DeleteDocumentService;\na publish-step failure also rolls back\nthat item's own saved draft"]
    Fail -- no --> Done1["all created and published"]
    Rollback -.-> Note1["not a spanning DB transaction —\ncompensating deletes only"]

    Route --> BD["BulkDeleteService.execute"]
    BD --> Span["genuinely all-or-nothing,\none spanning $transaction"]
    Span --> Timeout["timeout scaled 2000ms x documentIds.length,\nfloor 5000ms"]
    Timeout --> BadId{"any bad ID?"}
    BadId -- yes --> WholeRollback["throws, rolls back the whole batch"]
    BadId -- no --> Done2["all deleted"]
```

## Diagram F — duplicate

```mermaid
sequenceDiagram
    participant C as Client
    participant Ctl as CollectionTypeDocumentController
    participant Svc as DuplicateDocumentService

    C->>Ctl: POST :slug/:documentId/duplicate
    Ctl->>Svc: execute(slug, documentId, userId)
    Svc->>Svc: read source at save-version, hydrate components
    Svc->>Svc: write fresh randomUUID() documentId, timestamps, userId
    Note over Svc: shares underlying media UUID foreign keys —\nno deep copy of media assets
    Svc-->>Ctl: new DocumentEntity
    Ctl-->>C: 201, toDocumentResponse
```

## Diagram G — REST surface differences and `updatedBy`

```mermaid
flowchart TD
    Coll["CollectionTypeDocumentController\ndocumentId param, full CRUD + bulk + duplicate"]
    Single["SingleTypeDocumentController\nno documentId param, no DELETE,\nno bulk, no duplicate — mirrors collection\nservices minus documentId"]
    Public["PublicDocumentController\nno guards at all —\nalways reads only the published version,\n404 otherwise, draft unreachable\nregardless of Mode A/B"]

    Coll --> UB["every authenticated method calls\nresolveUpdatedBy(userId): users.findById,\nshapes { documentId, name } or null"]
    Single --> UB
    UB --> Mapper["3rd arg to toDocumentResponse —\nkey is OMITTED entirely, not null,\nwhen the 3rd arg isn't passed"]
    Public --> NoUB["calls toDocumentResponse with only 2 args —\npublic responses never get updatedBy"]

    List["ListDocumentsService.execute"] --> Batch["collects unique non-null updatedBy ids\ninto a Set, one findByIds call\nregardless of page size"]
```

Sources read: `src/modules/document/presentation/collection-type-document.controller.ts`,
`src/modules/document/presentation/single-type-document.controller.ts`,
`src/modules/document/presentation/public-document.controller.ts`,
`src/modules/document/application/services/save-document.service.ts`,
`src/modules/document/application/services/publish-document.service.ts`,
`src/modules/document/application/services/unpublish-document.service.ts`,
`src/modules/document/application/services/delete-document.service.ts`,
`src/modules/document/application/services/duplicate-document.service.ts`,
`src/modules/document/application/services/bulk-create-publish.service.ts`,
`src/modules/document/application/services/bulk-delete.service.ts`,
`src/modules/document/application/services/list-documents.service.ts`,
`src/modules/document/application/support/draft-publish.policy.ts`,
`src/modules/document/application/support/component-io.service.ts`,
`src/modules/document/presentation/document-response.mapper.ts`.
