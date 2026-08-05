# Spec

Active spec: `docs/specs/document-io-performance-and-rollback.md` — batch/parallelize `ComponentIoService`'s sequential per-field, per-item round trips (root cause of ~1-3s live CV updates and every other component-heavy document action), and make `bulk-delete.service.ts` all-or-nothing to close the one confirmed rollback gap.
