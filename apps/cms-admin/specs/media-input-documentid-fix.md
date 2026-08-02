# Spec: Fix `MediaInput` document-save failure

Transient feature spec per `docs/rules/workflow.md`'s spec→build→update-docs→review→cleanup workflow. Delete this file once the Review step completes.

## Background

Reported bug: saving a document with a `media`-type schema field fails. Root-caused by reading the full save path (`docs/documents/form-system.md`, `docs/documents/media.md`, and the sibling `cms-api` backend's `docs/documents/media.md`/`field-type-mapping.ts`):

- `MediaInput.tsx`'s `handleSelect` currently does `field.onChange(selected)`, storing the **entire** `MediaAsset` object as the form field value.
- The backend's `media` field type is a scalar FK column: `TEXT REFERENCES media_assets(document_id)` (`apps/cms-api/.../field-type-mapping.ts`). Save goes through a raw parameterized `INSERT` with no per-column serialization for non-JSON columns (`fieldsToRowValues` in `apps/cms-api/.../row-mapper.ts`) — a JS object bound to that column gets `JSON.stringify`'d by the `pg` driver and fails the FK constraint, since that JSON string never matches a real `media_assets.document_id`.
- The read path is symmetric: `GetDocumentForEditService` returns the raw column value for an existing document, i.e. a **plain documentId string**, not an object. `MediaInput`'s `isMediaAssetObject` guard (`typeof value === "object"`) never matches that, so an already-saved media selection wouldn't render on edit either, even if a save had somehow succeeded.
- `MediaInput.test.tsx`'s third test is titled "stores documentId and shows preview URL when an asset is selected" but never actually asserts the field's underlying value — it only checks the rendered `<img>` `src` after selection, so it currently passes despite the object-storing bug. The title is aspirational, not accurate to current behavior.

This is a **frontend-only** fix — the backend's `media` column contract (plain documentId string) is already correct and out of scope; nothing in `apps/cms-api` changes.

## Objective

`MediaInput` must store a `media` field's value as a plain `documentId: string | null` (matching the backend's FK contract), and resolve the full `MediaAsset` (for thumbnail/filename display) by looking that id up against `useMediaList()`'s cached data — both for a freshly-selected asset and for a value loaded from an existing document.

## Acceptance Criteria

1. Selecting an asset in the `MediaLibrary` picker sets the field value to `selected.documentId` (a string), not the asset object.
2. Removing a selection (the "Remove image" button) sets the field value to `null`, unchanged from today.
3. Given a field value that's a non-empty string, `MediaInput` resolves the matching `MediaAsset` from `useMediaList()` by `documentId` and renders its `thumbnailUrl || url` and `fileName`, exactly as today's object-based rendering did.
4. While `useMediaList()` is loading (id not yet resolvable either way), render a neutral loading placeholder — not the "Click to select media" empty state and not a broken `<img>`.
5. Once `useMediaList()` has loaded and the field's `documentId` isn't found in it (deleted asset, or any other desync), render a distinct "missing asset" placeholder — visually distinguishable from both the loading state and the empty (`Click to select media`) state.
6. A field value of `null`/`undefined` continues to render today's empty "Click to select media" state, unaffected by `useMediaList()`'s own loading state.
7. Submitting a form with a selected media field now sends a plain documentId string in the mutation payload — verified via an assertion on the submitted value (not just rendered `<img src>`, which was the previous test suite's gap), e.g. through `FormProvider`'s `mutationFn` mock.
8. Existing `MediaInput.test.tsx` cases still pass (updated where their setup/assertions need to reflect the new documentId-based value shape and the `useMediaList()` dependency the component now has at mount, not just after opening the picker).

## Tech Stack / Constraints

No new dependencies. Reuses existing patterns already in the codebase:
- `useMediaList()` (`src/hooks/useMedia.ts`) for the id→asset lookup — already fetched by `MediaLibrary`, will now also be needed inside `MediaInput` itself (or lifted/shared) since resolution must happen even when the picker dialog is closed.
- `react-hook-form`'s `Controller` (already in use).
- Existing Tailwind/`cn()` styling conventions for the two new placeholder states (loading, missing-asset).

## Project Structure (files touched)

```
src/components/form/inputs/MediaInput.tsx            → field.value becomes documentId string | null; resolve MediaAsset via useMediaList()
src/components/form/inputs/__tests__/MediaInput.test.tsx → update fixtures/assertions for documentId-based value; add loading/missing-asset/submit-value cases
```

No changes to `src/components/media/MediaLibrary.tsx`'s own props/behavior (`onSelect(asset: MediaAsset)` stays as-is — `MediaInput` is the one that now extracts `.documentId` from it), `src/hooks/useMedia.ts`, `src/types/cms.ts`, or anything in `apps/cms-api`.

## Code Style

Match existing conventions in this file/module: named function component exports, `Controller`-wrapped inner component pattern already present (`MediaInputInner`), Tailwind utility classes (no new class-composition helper needed for two small placeholder states).

## Testing Strategy

Vitest + Testing Library, `axios-mock-adapter` for `/media` — same harness `MediaInput.test.tsx` already uses. New/updated cases per the Acceptance Criteria above: loading placeholder before `/media` resolves, missing-asset placeholder for an unresolvable id, and a submit-time assertion (via `FormProvider`'s `mutationFn`) that the payload carries a plain string, not an object.

## Boundaries

- **Always:** run `bun run lint` and `bun run test` before considering this done; format touched files with `bun run format`.
- **Ask first:** any change to `MediaLibrary.tsx`'s `onSelect` contract, or to the backend's `media` column contract (out of scope — confirmed correct as-is).
- **Never:** commit without explicit confirmation of the exact staged files + message; touch `apps/cms-api` for this fix.

## Out of Scope

The separately-reported "uploaded filename shows as `avatar_{hash}.jpg`" issue is explicitly **not** part of this spec — root cause unconfirmed pending a Network-tab capture of the raw `POST /api/v1/media/upload` response body, to be spec'd separately once that evidence is available.
