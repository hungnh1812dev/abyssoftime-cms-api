# Plan: Gate mutating action buttons on granted permissions

Spec: `specs/action-button-permission-gating.md`. Decision rationale: `docs/documents/permission-gating-techstack.md`. Frontend-only — no backend changes.

## Context

Survey (in the spec) found only `UsersPage` correctly gates its mutating buttons; every other
mutating button across Access Tokens, Roles, Permissions, Media Library, and Content-Type
records/documents renders active regardless of the current user's permissions, relying entirely
on the backend to reject. Document actions (create/update/delete/publish/unpublish) additionally
support a content-type-scoped permission form (`document:<action>:<slug>`) that the existing
`hasPermission()` doesn't understand.

## Dependency Graph

```
Task 1 (foundation: hasDocumentPermission, usePermissionGate, ui/tooltip.tsx, PermissionTooltip)
   │
   ├── Task 2 (AccessTokensPage)
   ├── Task 3 (RolesPage)
   ├── Task 4 (PermissionsPage)
   ├── Task 5 (MediaLibraryPage)
   ├── Task 6 (MediaLibrary picker)
   │         [Tasks 2-6 are independent of each other, all depend only on Task 1]
   │
   ├── Task 7 (CollectionListPage — scoped)
   └── Task 8 (ContentTypeBuilder + ContentTypePanel — scoped)
             [Tasks 7-8 are independent of each other and of 2-6, depend only on Task 1]
```

Tasks 2-8 all depend on Task 1 only, not on each other — safe to parallelize across sessions once
Task 1 lands. Grouped into three phases below purely for checkpoint cadence (settings pages vs.
scoped document pages), not because of a real dependency between them.

## Task List

### Phase 0: Foundation

- [ ] **Task 1: Shared gating primitives**
  - `src/lib/permissions.ts`: add `hasDocumentPermission(granted: string[], action: string, contentTypeSlug: string): boolean` — mirrors backend `isDocumentActionGranted` exactly (`apps/cms-api/src/common/authorization/document-permission.util.ts`): `granted.includes(`document:${action}`) || granted.includes(`document:${action}:${contentTypeSlug}`)`. Add `usePermissionGate(required: string, contentTypeSlug?: string): { allowed: boolean; reason: string }` — reads `permissions` from `useAuth()`; without `contentTypeSlug` uses `hasPermission()` (bare, with existing `:read`←`:manager` fallback); with it, treats `required` as a document action base and uses `hasDocumentPermission()`. `reason` is the fixed template `Requires the "${required}" permission` (or a scoped variant when `contentTypeSlug` is given).
  - New `src/components/ui/tooltip.tsx`: wraps `@base-ui/react/tooltip`, following `dropdown-menu.tsx`'s wrapper shape (`data-slot`, `cn()`, Portal/Positioner/Popup, `TooltipProvider`/`Tooltip`/`TooltipTrigger`/`TooltipContent` exports).
  - New `src/components/permissions/PermissionTooltip.tsx`: composes the gate hook + tooltip. Props: `required`, optional `contentTypeSlug`, `children` (a single disable-able trigger element, typically a `Button`). When `!allowed`, clones/wraps the child with `disabled` and wires the tooltip to show `reason` — **wrap the disabled child in a non-disabled `<span tabIndex={0}>` tooltip trigger**, since disabled elements don't reliably fire the hover/focus events tooltips depend on in most browsers/Base UI. When `allowed`, renders the child unmodified (no tooltip wrapper, no behavior change).

  **Acceptance criteria:** spec's AC 8-9; `hasDocumentPermission` unit-tested against the same bare/scoped cases as the backend's `isDocumentActionGranted` tests; `usePermissionGate` unit-tested for both bare and scoped modes; `PermissionTooltip` has a render test confirming disabled+tooltip-trigger-present when denied, and unmodified passthrough when allowed.
  **Verification:** `bun run test -- src/lib/__tests__/permissions.test.ts src/components/permissions/__tests__/PermissionTooltip.test.tsx`; `bun run build` (typecheck).
  **Files:** `src/lib/permissions.ts`, `src/lib/__tests__/permissions.test.ts`, `src/components/ui/tooltip.tsx`, `src/components/permissions/PermissionTooltip.tsx`, `src/components/permissions/__tests__/PermissionTooltip.test.tsx`.
  **Estimated scope:** M (5 files, 1 new UI primitive + 1 new composition component + lib additions).

### Checkpoint: Foundation

- [ ] `bun run lint`, `bun run test`, `bun run build` all clean.
- [ ] Review with human before starting Phase 1/2 (foundation shape affects every later task's call-site code).

### Phase 1: Settings pages (bare permission, independent slices)

- [x] **Task 2: `AccessTokensPage` — Revoke/Delete**
  Wrap the Revoke button (`AccessTokensPage.tsx:175-177`) and Delete button (`:178-187`) in `<PermissionTooltip required="api_token:manager">`.
  **Acceptance:** spec AC 1. **Verify:** `bun run test -- src/pages/admin/settings/__tests__/AccessTokensPage.test.tsx`; add a denied-permission case + an allowed case.
  **Files:** `AccessTokensPage.tsx`, `__tests__/AccessTokensPage.test.tsx`. **Scope:** S.

- [x] **Task 3: `RolesPage` — Create/Edit/Delete**
  Wrap "Create Role" (`RolesPage.tsx:147-149`), "Edit" (`:180-182`), "Delete" (`:184-194`) in `<PermissionTooltip required="role:manager">`.
  **Acceptance:** spec AC 2. **Verify:** `bun run test -- src/pages/admin/settings/__tests__/RolesPage.test.tsx`.
  **Files:** `RolesPage.tsx`, `__tests__/RolesPage.test.tsx`. **Scope:** S.

- [x] **Task 4: `PermissionsPage` — Create/Edit/Delete**
  Wrap "Create Permission" (`:129-131`), "Edit" (`:157-159`), "Delete" (`:160-169`) in `<PermissionTooltip required="permission:manager">`.
  **Acceptance:** spec AC 3. **Verify:** `bun run test -- src/pages/admin/settings/__tests__/PermissionsPage.test.tsx`.
  **Files:** `PermissionsPage.tsx`, `__tests__/PermissionsPage.test.tsx`. **Scope:** S.

- [x] **Task 5: `MediaLibraryPage` — Upload/Delete**
  Gate the Upload button (`:49-51`) and per-asset delete icon-button (`:94-100`) on `media:manager`. The delete icon is a raw `<button>` (not `Button`), so `PermissionTooltip` must accept a raw `<button>` child too — verify/adjust its typing in Task 1 if this surfaces a gap. **No test file exists for this page yet** — create `MediaLibraryPage.test.tsx` (new).
  **Acceptance:** spec AC 4 (page half). **Verify:** `bun run test -- src/pages/admin/settings/__tests__/MediaLibraryPage.test.tsx`.
  **Files:** `MediaLibraryPage.tsx`, new `__tests__/MediaLibraryPage.test.tsx`. **Scope:** M (new test file from scratch).

- [x] **Task 6: `MediaLibrary` (embedded picker) — Upload/Delete**
  Same gate (`media:manager`) on the picker's "Upload More"-triggered upload button (`:109-111`) and per-asset delete icon-button (`:135-144`).
  **Acceptance:** spec AC 4 (picker half). **Verify:** `bun run test -- src/components/media/__tests__/MediaLibrary.test.tsx`.
  **Files:** `MediaLibrary.tsx`, `__tests__/MediaLibrary.test.tsx`. **Scope:** S.

### Checkpoint: Settings pages

- [x] `bun run lint`, `bun run test`, `bun run build` all clean, no new warnings.
- [x] Live walkthrough: log in as a role with only `*:read` grants (Guest, extended with `role:read`/`permission:read`/`api_token:read`/`media:read`); confirmed every button from Tasks 2-6 is visibly disabled with a tooltip on hover (`AccessTokensPage` Revoke, `RolesPage` Create Role, `PermissionsPage` Create Permission, `MediaLibraryPage` upload/delete) — re-enable-on-grant not separately re-verified this session (permissions were set before login, not changed mid-session).
- [x] Commit (per checkpoint-commit-timing rule): once automated checks pass, before starting Phase 2.

### Phase 2: Content-type / document pages (scoped permission)

- [x] **Task 7: `CollectionListPage` — Add/Duplicate/Delete/bulk-delete**
  Gate "Add new item" (`:341`) and the row "Duplicate" button (`:460-462`, since duplicating creates a new record) on `hasDocumentPermission(permissions, "create", contentType.slug)`. Gate the row "Delete" (`:463-465`) and "Delete selected" bulk button (`:385-387`) on `hasDocumentPermission(permissions, "delete", contentType.slug)`. Leave "Edit" (pencil, navigation-only) ungated.
  **Risk:** this file is already 505 lines (over the project's 500-line module cap) before this change. Mitigation: extract the delete-confirmation `<Dialog>` (`:356-380`) into a sibling `DeleteConfirmDialog` component in the same directory as part of this task, to both offset the added gating code and bring the file back under budget — do this extraction first, verify it's a pure no-op refactor (existing tests still pass), then add the gating.
  **Acceptance:** spec AC 5. **Verify:** `bun run test -- src/pages/admin/panels/collection-type/layout/__tests__/CollectionListPage.test.tsx`; file line count back at or under 500 (`wc -l`).
  **Files:** `CollectionListPage.tsx`, new `DeleteConfirmDialog.tsx` (extraction), `__tests__/CollectionListPage.test.tsx`. **Scope:** M.

- [x] **Task 8: `ContentTypeBuilder` + `ContentTypePanel` — Save/Publish/Unpublish**
  Add a `requiredPermission: string` prop to `ContentTypeBuilder` (threaded to `FormActions`'s Save button at `ContentTypeBuilder.tsx:24`, wrapped in `PermissionTooltip` with `contentTypeSlug`). Caller (`ContentTypePanel.tsx`) computes it per call site: line-102 branch → `isNew ? "create" : "update"` (single-type first-save is always `"update"`, no create endpoint exists for single types); line-163 branch (doc exists) → always `"update"`. Gate Publish (`:173-183`) on `hasDocumentPermission(permissions, "publish", contentType.slug)` and Unpublish (`:184-194`) on `"unpublish"`, layered on top of the existing `canPublish`/`canUnpublish` visibility conditions (unchanged).
  **Acceptance:** spec AC 6. **Verify:** `bun run test -- src/pages/admin/panels/content-type/__tests__/ContentTypeBuilder.test.tsx src/pages/admin/panels/content-type/__tests__/ContentTypePanel.test.tsx`.
  **Files:** `ContentTypeBuilder.tsx`, `ContentTypePanel.tsx`, both `__tests__` files. **Scope:** M.

### Checkpoint: Content-type / document pages

- [x] `bun run lint`, `bun run test`, `bun run build` all clean, no new warnings.
- [x] Live walkthrough: as Guest with `document:read` (bare) + `document:create:cv-page` only (no bare `document:create`), confirmed "Add new item" is enabled on `cv-page` and disabled on `en-it-vocab`; confirmed the `CollectionListPage` Duplicate/Delete icons on `en-it-vocab` are disabled with the scoped tooltip text (`Requires the "document:create"/"document:delete" permission for this content type`); confirmed `ContentTypeBuilder` Save/Unpublish disabled with scoped tooltip on an existing `en-it-vocab` doc, and Save enabled on a new `cv-page` doc. Bare unscoped-grant-enables-everywhere case not separately re-verified this session (would require a second role/session swap).
- [x] Commit once automated checks pass (checkpoint-commit-timing rule).

### Final Checkpoint

- [ ] Full `bun run lint` + `bun run test` + `bun run build` clean across the whole diff.
- [x] **Update docs** (workflow step 5): mention button-level permission gating in `docs/documents/access-control.md` (settings pages), `docs/documents/content-type.md` or `documents.md` (scoped document actions), `docs/documents/media.md` (upload/delete gating).
- [ ] **Review**: five-axis code review (correctness, readability, architecture, security, performance) — security axis specifically checks that this is UI-only defense-in-depth, not a substitute for the (already-correct) backend guards.
- [ ] **Clean up**: delete `specs/action-button-permission-gating.md` per workflow step 7, after Review completes.

## Risks and Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| `CollectionListPage.tsx` already exceeds the 500-line module cap | Medium — adding code without addressing this compounds an existing violation | Task 7 extracts `DeleteConfirmDialog` first (see Task 7) |
| Base UI Tooltip may not fire on a truly `disabled` DOM button (known cross-library issue, not confirmed yet for `@base-ui/react`) | Medium — silently broken tooltip would fail AC 8 without an obvious test failure | `PermissionTooltip` wraps the disabled child in a focusable/hoverable `<span>` (Task 1); add an explicit RTL test asserting the tooltip trigger element itself isn't `disabled` even though the inner button is |
| `MediaLibraryPage` has no existing test file — first test added alongside a behavior change rather than as a pure baseline | Low | Keep the new test file scoped to exactly the gating behavior (Task 5), not a full retroactive test suite for the whole page |
| Granting a permission via the Roles page may not immediately reflect in an already-logged-in session's `useAuth().permissions` (cache/staleness) | Low-Medium — could make the live walkthrough steps look "broken" when it's actually a pre-existing session-refresh gap outside this spec's scope | Note actual observed behavior during the Phase 1 checkpoint walkthrough; if permissions genuinely don't refresh without re-login, flag as a separate follow-up, don't silently expand this spec to fix it |

## Open Questions

- Should `PermissionTooltip`'s reason text differentiate "you don't have this permission" from "this is a document action scoped to a different content type" (e.g. user has `document:create:other-post` but not for the current type)? The spec's fixed-template approach doesn't distinguish these; flag during Review if it reads as confusing in the live walkthrough.
