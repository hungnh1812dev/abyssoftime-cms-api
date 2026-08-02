# Todo: Fix `MediaInput` document-save failure

Full detail/acceptance-criteria/verification per task lives in `tasks/plan.md`. Check off here as
each task completes.

- [x] 1. Store `documentId` on select/remove; resolve display asset via `useMediaList()`
      (loading / resolved / missing placeholder states)
- [x] 2. Update `MediaInput.test.tsx` — real submit-value assertion, existing-value resolution,
      loading placeholder, missing-asset placeholder
- [ ] **Checkpoint** — lint/test/build clean; live walkthrough (select→save→reload→re-resolve,
      clear→save, confirm string payload in Network tab); commit
