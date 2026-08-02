# Plan: Fix `MediaInput` document-save failure

Spec: `specs/media-input-documentid-fix.md`. Single-module, frontend-only fix — no backend changes.

## Context

`MediaInput.tsx` currently stores the entire `MediaAsset` object as a `media` field's form value.
The backend's `media` column is a scalar FK (`TEXT REFERENCES media_assets(document_id)`); an
object bound to that column gets `JSON.stringify`'d by the `pg` driver and fails the FK
constraint on save. The read path is symmetric — an existing document's media field comes back as
a plain documentId string, which `MediaInput`'s current object-only guard never matches either.
Full root-cause trace is in the spec.

## Dependency Graph

```
Task 1 (component fix: value shape + resolution + placeholder states)
   └── Task 2 (test suite: cover new behavior, including submit-payload assertion)
          └── Checkpoint (automated + live verification)
```

Both tasks touch only `src/components/form/inputs/MediaInput.tsx` and its co-located test file —
no other module depends on or feeds into this slice (`MediaLibrary.tsx`'s `onSelect(asset)`
contract is unchanged; `MediaInput` is the only thing that now extracts `.documentId` from it).

## Task List

- [x] **Task 1: Store `documentId`, resolve display asset via `useMediaList()`**
  `src/components/form/inputs/MediaInput.tsx`:
  - `handleSelect` calls `field.onChange(selected.documentId)` instead of `field.onChange(selected)`.
  - `handleRemove` keeps setting `field.onChange(null)` (unchanged).
  - `MediaInputInner` calls `useMediaList()` itself (needed even while the picker dialog is
    closed, since resolution must happen on mount/whenever `field.value` is a non-empty string).
  - Replace the `isMediaAssetObject`/`asset` derivation: field value is now `string | null`. When
    it's a non-empty string, look it up in `useMediaList()`'s data by `documentId`.
  - Three renderable states for a non-null string value: **loading** (list still fetching —
    neutral placeholder, distinct from both the empty "Click to select media" state and a broken
    `<img>`), **resolved** (found — same thumbnail/filename rendering as today), **missing**
    (list loaded, id not found — distinct "missing asset" placeholder).
  - `null`/`undefined` value still renders today's empty "Click to select media" state regardless
    of `useMediaList()`'s own loading state.

  **Acceptance criteria:** spec's AC 1–6.
  **Verification:** `bun run build` (typecheck) passes; manual read-through confirming
  `field.onChange` never receives an object.

- [x] **Task 2: Update test suite for the new value shape and states**
  `src/components/form/inputs/__tests__/MediaInput.test.tsx`:
  - Fix the existing "stores documentId..." test to actually assert the field's underlying value
    (not just the rendered `<img src>`) — e.g. via `FormProvider`'s `mutationFn` mock, submitting
    the form and asserting the payload's field value is `mediaItems[0].documentId`, a string.
  - Add a case seeding the form with an existing string `documentId` value and asserting it
    resolves to the matching asset's thumbnail/filename once `/media` responds.
  - Add a case for the loading placeholder (assert it renders before the mocked `/media` response
    resolves).
  - Add a case for the missing-asset placeholder (a `documentId` value with no matching item in
    the mocked `/media` response).
  - Keep the two unaffected existing tests (upload-zone render, dialog-open) passing as-is.

  **Acceptance criteria:** spec's AC 7–8.
  **Verification:** `bun run test -- src/components/form/inputs/__tests__/MediaInput.test.tsx`
  green.

## Checkpoint (end of this plan)

- `bun run lint`, `bun run test`, `bun run build` all clean, no new warnings.
- Live walkthrough against the running app (per this repo's UI-change rule): open a content type
  with a media field, select an asset, save, confirm no error and the thumbnail persists; reload
  the edit page and confirm the saved selection re-resolves and renders; clear the selection and
  save again; confirm via the Network tab that the request payload for the media field is a plain
  string, not an object.
- Commit once the above is green (per `docs/rules/workflow.md`'s checkpoint-commit-timing rule —
  this single-phase plan has one checkpoint, commit after it passes).

## Noted but Out of Scope (flag, don't fix here)

While tracing every consumer of a `media`-typed field's raw value for this plan, found a second,
**pre-existing, unrelated** bug: `CollectionListPage.tsx`'s `cellValue()` renders an `image`-type
list column as `<img src={String(raw))} />`, where `raw` is the document's raw stored value for
that field — a documentId string, not a URL. This has never rendered a real thumbnail in the list
view, independent of anything this plan touches. Not in the approved spec's scope; flagging for a
separate follow-up spec if wanted.

## Risks and Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| `MediaInputInner` now calls `useMediaList()` unconditionally (previously only `MediaLibrary` did, and only while the dialog was open) — extra network/query overhead per media field on every form | Low | `useMediaList()` is already a single shared TanStack Query cache key (`["media"]`); every `MediaInput` on a page shares one cached fetch, not one per field |
| A document with many media fields could show several loading placeholders briefly on first paint | Low | Expected/acceptable per spec AC 4 — same cache, resolves together once |

## Verification Summary

One checkpoint, covering both tasks: `bun run lint` + `bun run test` + `bun run build` clean,
plus the live walkthrough above. Commit after checkpoint passes, then proceed to the spec's
Update-docs (`docs/documents/form-system.md`/`media.md` mention `MediaInput`'s value shape) →
Review → Clean-up steps per `docs/rules/workflow.md`.
