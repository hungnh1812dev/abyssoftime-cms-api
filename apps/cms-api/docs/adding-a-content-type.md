# How to Add a New Content Type

A content type is defined entirely as a JSON file — no migration, no code, no new module. Drop a file under `content-types/`, restart the app, and `ContentTypeSyncService` creates (or alters) the Postgres tables and wires up the REST routes for you.

For the full internals (sync engine, table naming, validation rules), see [`docs/documents/content-type.md`](documents/content-type.md). This page is the practical "I just want to add one" walkthrough.

## 1. Create the JSON file

Add a new file at `content-types/<slug>.json` (the directory is `CONTENT_TYPES_DIR`, default `content-types`, relative to the repo root). The filename doesn't matter — `slug` inside the JSON is what's used everywhere.

```json
{
  "slug": "blog-post",
  "name": "Blog Post",
  "kind": "collection",
  "draftToPublish": true,
  "fields": [
    { "name": "title", "type": "text" },
    { "name": "featured", "type": "boolean", "width": "50%" },
    { "name": "body", "type": "richtext" },
    { "name": "coverImage", "type": "media" },
    { "name": "metadata", "type": "json" },
    {
      "name": "banner",
      "type": "component",
      "component": "banner",
      "repeatable": false,
      "fields": [
        { "name": "headline", "type": "text" },
        { "name": "background", "type": "media" }
      ]
    }
  ],
  "listFields": ["title", "featured", "coverImage"]
}
```

### Top-level fields

| Field            | Required | Notes                                                                                  |
| ---------------- | -------- | --------------------------------------------------------------------------------------- |
| `slug`           | yes      | `^[a-z0-9]+(?:-[a-z0-9]+)*$`, 1–53 chars (`assertSafeSlug`). Kebab-case. Never changes after creation without treating it as a delete + recreate (see [Renaming or removing](#renaming-or-removing-a-content-type)). |
| `name`           | yes      | Human-readable display name.                                                            |
| `kind`           | yes      | `"single"` (one singleton row, no `DELETE` route) or `"collection"` (many documents, full CRUD). |
| `draftToPublish`| yes      | `true` = separate draft/published rows (Mode A); `false` = a save is immediately live (Mode B). |
| `fields`         | yes      | Array of field definitions, see below. Order matters for `listFields` defaulting.       |
| `listFields`     | no       | Column names shown in the collection list view. Defaults to the **first 3 field names** if omitted. Must reference real field names. |

### Field definition

| Field        | Required                | Notes |
| ------------ | ------------------------ | ----- |
| `name`       | yes                       | `^[a-zA-Z][a-zA-Z0-9]*$` (camelCase, **no hyphen/underscore**), 1–53 chars (`assertSafeFieldName`). Can't collide with a reserved system field name: `id, document_id, version, created_at, updated_at, published_at, created_by, updated_by, published_by`. |
| `type`       | yes                       | One of `text`, `richtext`, `number`, `boolean`, `media`, `json`, `component`. See mapping table below. |
| `width`      | no                        | Layout hint for the admin form (e.g. `"50%"`), no backend effect. |
| `header`     | no                        | Layout hint, no backend effect. |
| `component`  | only if `type: component` | Name of the nested component (used to derive its table name). |
| `repeatable` | only if `type: component` | `true` = array of entries, `false`/omitted = a single nested object. |
| `fields`     | only if `type: component` | Nested array of field definitions — components can nest arbitrarily deep (the real seeds go 2 levels: `experiences → roles`). |

### Field type → Postgres column

| `type`      | Column type                                              |
| ----------- | --------------------------------------------------------- |
| `text`      | `TEXT`                                                     |
| `richtext`  | `TEXT`                                                     |
| `number`    | `DOUBLE PRECISION`                                         |
| `boolean`   | `BOOLEAN`                                                  |
| `media`     | `UUID REFERENCES media_assets(document_id) ON DELETE SET NULL` |
| `json`      | `JSONB`                                                    |
| `component` | no column — becomes its own child table                   |

## 2. Restart the app

`ContentTypeSyncService` runs on every boot (`OnApplicationBootstrap`), before anything else touches the database:

```bash
bun run start:dev
```

If the JSON fails validation (unsafe slug/field name, reserved-name collision, an unknown `listFields` entry, malformed JSON), boot aborts loudly — there's no partial/best-effort load. Fix the file and restart.

On a clean boot for a new content type, the sync engine:
1. Creates `documents_<slug_with_hyphens_underscored>` (e.g. `blog-post` → `documents_blog_post`).
2. Creates one table per component path (`components_<slug>__<path>`, e.g. `components_blog_post__banner`).
3. Inserts the `ContentType` row (`content_types` table) that the REST/GraphQL layer reads at request time.

No manual Prisma migration is needed for content data — only the `ContentType`/`content_types` metadata table itself is a real Prisma model; the per-content-type document/component tables are managed entirely by the sync engine's raw DDL.

## 3. Use it

Once synced, these routes exist automatically (all under `/api/v1`, `JwtAuthGuard` + `PermissionsGuard`, permissions are the generic `document:*` slugs — not per-content-type, so no new permission seeding is needed):

**Collection-type** (`kind: "collection"`):

| Method   | Path                                        | Permission |
| -------- | -------------------------------------------- | ------------------------- |
| `GET`    | `documents/collection-type/:slug`            | `document:read` (list, paginated) |
| `POST`   | `documents/collection-type/:slug`            | `document:create` |
| `GET`    | `documents/collection-type/:slug/:documentId`| `document:read` |
| `PUT`    | `documents/collection-type/:slug/:documentId`| `document:update` |
| `DELETE` | `documents/collection-type/:slug/:documentId`| `document:delete` |
| `POST`   | `documents/collection-type/:slug/:documentId/publish` | `document:publish` |
| `POST`   | `documents/collection-type/:slug/:documentId/unpublish` | `document:unpublish` |
| `POST`   | `documents/collection-type/:slug/:documentId/duplicate` | `document:create` |
| `POST`   | `documents/collection-type/:slug/bulk`       | `document:create` + `document:publish` |
| `DELETE` | `documents/collection-type/:slug/bulk`       | `document:delete` |

**Single-type** (`kind: "single"`):

| Method | Path                          | Permission        |
| ------ | ------------------------------ | ------------------ |
| `GET`  | `documents/single-type/:slug`  | `document:read`    |
| `PUT`  | `documents/single-type/:slug`  | `document:update`  |
| `POST` | `documents/single-type/:slug/publish` | `document:publish` |
| `POST` | `documents/single-type/:slug/unpublish` | `document:unpublish` |

**Public (published-only, no auth):** `GET public/documents/collection-type/:slug/:documentId`, `GET public/documents/single-type/:slug`.

Content-type metadata itself: `GET /api/v1/content-types` (list), `GET /api/v1/content-types/:slug` (`content_type:read`), and `PATCH /api/v1/content-types/:slug/list-fields` (`content_type:manager`, super-admin only — overrides the list-view columns without touching the JSON file; see [Admin-mutable `listFields`](documents/content-type.md#admin-mutable-listfields)).

## Editing an existing content type

Just edit the JSON file and restart — the sync engine diffs live Postgres columns against the desired `fields` and emits `ADD COLUMN` / `DROP COLUMN` / `ALTER COLUMN ... TYPE`. It never drops the whole table for a field-level change, so unrelated columns' data survives.

Two things worth knowing before you edit a live schema:
- **Removing a field drops its column and its data**, immediately on the next boot.
- **Changing a field's `type` to an incompatible one loses that column's data** (a same-shape retype to `text` casts safely; anything else is drop-and-add). This is an accepted gap — no manual-migration prompt, just a warning log.

## Renaming or removing a content type

There's no "rename" — the sync engine matches purely on `slug`. Renaming the `slug` in the JSON looks like "delete the old content type, create a new one" to the sync engine: the old tables get dropped and a fresh set created on the next boot. If you need to preserve data, migrate it manually before renaming.

Deleting the JSON file entirely causes the next boot to drop the document table, every component table (deepest first), and the `ContentType` row — full data loss, no soft-delete/undo.

## Reference

- Full module internals, validation rules, sync engine details, table naming/hash-truncation: [`docs/documents/content-type.md`](documents/content-type.md)
- Document lifecycle (draft/publish modes, bulk ops, component I/O): [`docs/documents/document.md`](documents/document.md)
- Two real examples to copy from: `content-types/cv-page.json` (deep component nesting), `content-types/en-it-vocab.json`.
