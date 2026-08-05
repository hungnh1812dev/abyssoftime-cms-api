# Content-type → SQL table sync flow

Scope: the boot-time pipeline that turns `content-types/*.json` schema-as-code into
live Postgres tables/columns — schema loading, validation, diffing, and DDL. Read
directly from `src/modules/content-type/**` — not inferred. Cross-referenced against
`docs/documents/content-type.md` and `docs/adding-a-content-type.md` for narrative
context only.

## Diagram — boot-time sync pipeline

```mermaid
flowchart TD
    Boot["ContentTypeSyncService.onApplicationBootstrap()"] --> Load["SchemaLoaderService.load()"]
    Load --> Dir["readdir CONTENT_TYPES_DIR"]
    Dir -->|"directory missing"| DirErr["ContentTypesDirectoryNotFoundError\naborts boot"]
    Dir --> Files["filter *.json, sort deterministically"]
    Files --> Parse["JSON.parse each file"]
    Parse --> Default["listFields defaulted to first 3 field names if absent"]
    Default --> Validate["validateContentTypeDefinition() per file"]
    Validate -->|"invalid: unsafe slug/field name,\nreserved name collision, bad listFields ref"| ValErr["throws — aborts entire boot,\nno partial load"]
    Validate --> Definitions["ContentTypeDefinition[] in memory"]

    Definitions --> Diff["schema-differ: diffColumns(liveColumns, desiredFields)\nliveColumns from information_schema.columns"]
    Diff --> D1{"field present in desired,\nabsent in live?"}
    D1 -- yes --> AddCol["addColumns"]
    Diff --> D2{"field present in both,\ntype mismatch?"}
    D2 -- "target type is text" --> Retype["retypeColumns, safe cast"]
    D2 -- "incompatible types" --> DropAdd["dropColumns + addColumns\nloses data"]
    Diff --> D3{"live column not in desired,\nnot a reserved system column?"}
    D3 -- yes --> DropCol["dropColumns"]

    Diff --> DiffComp["diffComponentTables:\ndiff nested component paths, depth-first"]
    DiffComp --> D4{"component path added or removed?"}
    D4 -- added --> AddCompTable["new component table"]
    D4 -- removed --> DropCompTable["drop component table"]

    AddCol --> Sync["ContentTypeSyncService.sync()"]
    Retype --> Sync
    DropAdd --> Sync
    DropCol --> Sync
    AddCompTable --> Sync
    DropCompTable --> Sync

    Sync --> S1{"content type is new?"}
    S1 -- yes --> Create["ensureDocumentTable:\nCREATE TABLE IF NOT EXISTS + index on document_id"]
    S1 -- no --> Alter["alterDocumentTable:\nsingle ALTER TABLE combining\nADD COLUMN / DROP COLUMN / ALTER COLUMN TYPE USING"]
    Create --> Row["upsert ContentType row"]
    Alter --> Row

    Sync --> S2{"content type removed entirely\nfrom content-types/*.json?"}
    S2 -- yes --> Deletion["syncDeletion:\ndrop component tables deepest-first,\nthen DROP TABLE IF EXISTS ... CASCADE\non the document table,\nthen delete ContentType row"]

    Row --> Ident["SQL identifier safety"]
    Ident --> I1["assertSafeSlug / assertSafeFieldName:\ncap at 53 chars, headroom under Postgres 63-byte limit"]
    Ident --> I2["componentTableName / indexName:\nif full name exceeds 63 bytes,\nSHA-256 hash, first 8 hex chars appended as suffix,\npath segment truncated to fit — deterministic"]
```

## Notes

- **Confirmed rule**: `DROP TABLE` is issued only from `syncDeletion` /
  `dropComponentTable` / `dropDocumentTable` — never from `alterDocumentTable` /
  `alterComponentTable`, which only ever emit `ADD/DROP COLUMN` or `ALTER COLUMN TYPE`.
- A field removed from the JSON while the content type itself stays *does* get its column
  actually `DROP COLUMN`ed — it is not left behind as an orphan column. "Never drop" applies
  at the table level only, not the column level.
- The `listFields` admin-mutable exception (`PATCH content-types/:slug/list-fields`,
  gated by `content_type:manager`) writes only a separate `listFieldsOverride` column —
  the sync engine above never reads or writes that column, so admin overrides survive
  every reboot's diff/sync pass untouched.
- Content-type module has zero imports of the document module anywhere under
  `src/modules/content-type/**` (confirmed by grep) — the module dependency arrow is
  one-way; `document` imports `content-type`, never the reverse.

Sources read: `src/modules/content-type/application/sync/content-type-sync.service.ts`,
`src/modules/content-type/application/schema/schema-loader.service.ts`,
`src/modules/content-type/application/schema/schema-validator.ts`,
`src/modules/content-type/application/sync/schema-differ.ts`,
`src/modules/content-type/infrastructure/persistence/prisma-schema-table.repository.ts`,
`src/modules/content-type/application/support/sql-identifier.ts`,
`src/modules/content-type/application/support/table-naming.ts`,
`src/modules/content-type/application/services/update-list-fields.service.ts`,
`src/modules/content-type/infrastructure/persistence/prisma-content-type.repository.ts`,
`content-types/cv-page.json`.
