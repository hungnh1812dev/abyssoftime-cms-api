# Media

`src/components/media/MediaLibrary.tsx`, `src/hooks/useMedia.ts`, `src/pages/admin/settings/MediaLibraryPage.tsx` — asset upload/browse/delete, both as a standalone settings page and as a picker modal embedded in schema forms via `MediaInput` (see [form-system.md](./form-system.md)).

## `useMedia.ts`

- `useMediaList(page, limit)` — `GET /api/media?page=&limit=`, no locale/search params (media assets aren't localized or server-side searchable in this frontend).
- `useUploadMedia` — `POST /api/media/upload`, `multipart/form-data` with a single `file` field per call; multi-file upload is a client-side loop of sequential `mutateAsync` calls (both `MediaLibrary` and `MediaLibraryPage` do this identically), not a batched endpoint.
- `useDeleteMedia` — `DELETE /api/media/:id`, called with the asset's `documentId` (not `ID`) from both call sites.

All three invalidate the `["media", "list"]` query key on success; none narrow invalidation to the current page, so any mutation refetches the currently-viewed page.

## `MediaLibrary` (modal picker)

Opened by `MediaInput` (see [form-system.md](./form-system.md)) when a media-type schema field is clicked. Fixed page size of 20, no search/filter UI beyond the `ext` prop — when `ext` is supplied (from the schema field's `ext` list), non-matching assets are **client-side filtered out of the current page's items** (`filteredItems`, not server-side filtered), so a page can show fewer than 20 (or zero) items even when more matching assets exist on other pages; there is no indication to the user that filtering is happening beyond the visibly shorter grid. Upload panel is collapsed by default (`showUpload` toggle), accepts files matching `ext` if provided else `image/*`. Selecting an asset calls the caller's `onSelect` then immediately closes the modal.

## `MediaLibraryPage` (`/admin/settings/media`)

A near-duplicate, always-expanded-upload version of the same grid/pagination/delete UI as `MediaLibrary`, minus the "select an asset" callback (this is the standalone browse/manage view, not a picker) and minus the `ext`-based filtering. The upload dropzone markup, staged-file preview grid, and delete-confirmation dialog are copy-pasted between this file and `MediaLibrary.tsx` almost verbatim — a candidate for extraction into a shared component the next time either needs a behavior change.

No route-level `minRole`/permission gate on `settings/media` in `router.tsx` (see [app-shell.md](./app-shell.md)) — unlike every other settings page. The sidebar link is still gated by `media:read` (see [navigation-shell.md](./navigation-shell.md)), so this is a UI-only gap: any authenticated user who knows/guesses the URL can reach the page directly.
