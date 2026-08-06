# Todo: Gate mutating action buttons on granted permissions

Full detail/acceptance-criteria/verification per task lives in `tasks/plan.md`. Check off here as
each task completes.

## Phase 0: Foundation
- [x] 1. `hasDocumentPermission`, `usePermissionGate` in `lib/permissions.ts`; new `ui/tooltip.tsx`;
      new `components/permissions/PermissionTooltip.tsx`
- [x] **Checkpoint** — lint/test/build clean; human review before Phase 1/2

## Phase 1: Settings pages
- [x] 2. `AccessTokensPage` — gate Revoke/Delete on `api_token:manager`
- [x] 3. `RolesPage` — gate Create/Edit/Delete on `role:manager`
- [x] 4. `PermissionsPage` — gate Create/Edit/Delete on `permission:manager`
- [x] 5. `MediaLibraryPage` — gate Upload/Delete on `media:manager` (new test file)
- [x] 6. `MediaLibrary` picker — gate Upload/Delete on `media:manager`
- [x] **Checkpoint** — lint/test/build clean; live walkthrough with a read-only role; commit

## Phase 2: Content-type / document pages
- [x] 7. `CollectionListPage` — gate Add/Duplicate (`document:create`, scoped) and
      Delete/bulk-delete (`document:delete`, scoped); extract `DeleteConfirmDialog` first to fix
      the pre-existing 500-line-cap overage
- [x] 8. `ContentTypeBuilder` + `ContentTypePanel` — gate Save (`document:create`/`update`,
      scoped) and Publish/Unpublish (`document:publish`/`unpublish`, scoped)
- [x] **Checkpoint** — lint/test/build clean; live walkthrough with a content-type-scoped role;
      commit

## Final
- [x] Update docs (`access-control.md`, `content-type.md`/`documents.md`, `media.md`)
- [x] Five-axis review (correctness, readability, architecture, security, performance)
- [ ] Delete `specs/action-button-permission-gating.md`
