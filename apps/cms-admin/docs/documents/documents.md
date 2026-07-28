# Documents (Collection & Single-Type Data)

`src/hooks/useCollectionDocuments.ts`, `src/hooks/useSingleTypeDocuments.ts`, `src/pages/admin/panels/collection-type/*`, `src/components/collection/*`, `src/hooks/useDebouncedValue.ts` — the document CRUD/list/publish data layer and the collection list-view UI. Consumed by [content-type.md](./content-type.md)'s `ContentTypePanel`/`ContentTypePage`.

## Data hooks

Both hook files follow the same shape: React Query wrappers around `/api/document-manager/{single-type,collection-type}/...`, each mutation invalidating the relevant list/detail query keys on success and toasting the API's `error` message on failure (`onMutationError`, duplicated verbatim in both files).

- **`useSingleTypeDocuments.ts`** — `useSingleTypeDocument(slug, locale)` treats a `404` as "not yet created" (`return undefined`, and its `retry` function stops retrying on `404` specifically — any other error still gets React Query's default retry). `useSaveSingleType` is a `PUT`. No delete — single types can't be deleted, only unpublished.
- **`useCollectionDocuments.ts`** — full CRUD plus `useBulkDeleteCollectionDocuments` (`DELETE .../bulk` with a `documentIds` body; toasts a combined "Deleted N, M failed" summary when the API reports partial failures) and `useDuplicateCollectionDocument` (`POST .../:id/duplicate`). `useCollectionDocuments(slug, start, size, locale, orderBy, sortDir, search)` is the list query — server-side pagination/sort/search, no client-side filtering.

Publish/unpublish invalidate both the detail query (keyed by `slug, id, locale`) and the list query, since a status change is visible in both places.

## `CollectionListPage` (`panels/collection-type/layout/CollectionListPage.tsx`)

The list view for a collection type, rendered by `ContentTypePage` (see [content-type.md](./content-type.md)) when `Kind === "collection"`. Notable design points:

- **URL as source of truth for list state** — `orderBy`/`sortDir`/`page`/`locale`/`pageSize`/`search` all live in `useSearchParams`, parsed defensively (`parseListState`: invalid `orderBy` values not in the content type's sortable-field set fall back to `id`, invalid page sizes fall back to `PAGE_SIZE_OPTIONS[0]`) and re-serialized to a **canonical** query string (`toCanonicalParams` — omits params equal to their default) on every state change, replacing history rather than pushing. A `useEffect` reconciles the URL to canonical form on mount/dependency changes for any URL a user might land on manually.
- **Search is the one documented exception** to that URL-is-truth rule: keystrokes update local `searchDraft` state immediately (so the input doesn't lag), and only the **debounced** value (400ms, via `useDebouncedValue`) gets written back to the URL/query. `searchDraft` is resynced from the committed URL value directly during render (comparing against a `prevActiveSearch` ref-like state pair) rather than in an effect — this also clears row selection whenever the effective search actually changes.
- **Column derivation** (`deriveColumns`) — registry override (see [content-type.md](./content-type.md)) wins outright; otherwise uses the content type's admin-configured `listFields` (minus always-separately-rendered system fields `createdAt`/`updatedAt`/`updatedByName`), falling back to the first 3 non-component schema fields if `listFields` is empty. `deriveSystemVisibility` similarly reads `listFields` to decide whether the Created/Updated/Updated-By columns show at all (empty `listFields` ⇒ show all three, by convention).
- **Bulk actions** — row checkboxes (`Set<string>` of `documentId`s) drive a bulk-delete confirmation bar; selection is cleared on search-change, locale-change, sort-change, and pagination.
- **Sortable columns** — only fields whose type is `text`/`number`/`boolean` (plus the always-sortable `id`/`createdAt`/`updatedAt`) get a clickable `SortableHeader`; clicking a currently-inactive column defaults to descending, clicking the active column flips direction.

## `ColumnChooserDialog` (`components/collection/ColumnChooserDialog.tsx`)

The "configure columns" modal (hidden entirely when a registry override exists, see [content-type.md](./content-type.md)). Default selection (when the content type has no saved `listFields` yet) is the first 3 non-component content fields plus all 3 system fields. Saves via `useUpdateListFields` (see [content-type.md](./content-type.md)), which persists to the content type itself (server-side), not per-user — one admin's column choice is everyone's column choice.

## `PageSizeSelector` (`components/collection/PageSizeSelector.tsx`)

Thin `Select` wrapper over `PAGE_SIZE_OPTIONS` (see [app-shell.md](./app-shell.md)).

## `useDebouncedValue` (`hooks/useDebouncedValue.ts`)

Generic `setTimeout`-based value debouncer; only current consumer is `CollectionListPage`'s search box.
