# Todo — Media Module + Storage Module (Go → NestJS/Prisma conversion)

See `tasks/plan.md` for full context and rationale.

## Phase 0 — Dependencies + Schema

- [x] `bun add @aws-sdk/client-s3 cloudinary`
- [x] `prisma/postgresql/schema.prisma` — `MediaAsset` model (`documentId` as `@id`, per confirmed
      decision, not the source doc's `gormId`); field set is a best-guess inference, see
      `tasks/plan.md`
- [x] `bun run prisma:migrate` — applied `20260726074800_add_media_assets`
- [x] `bun run prisma:generate` — `MediaAsset` present in generated client
- [x] **Checkpoint 0:** `bun run build` succeeds

## Phase 1 — Storage module

- [x] `storage-adapter.repository.ts` — port
- [x] `s3-storage.adapter.ts` + spec
- [x] `cloudinary-storage.adapter.ts` + spec
- [x] `lazy-storage.adapter.ts` + spec
- [x] `storage.module.ts`
- [x] **Checkpoint 1:** `bun run test storage` green, build clean

## Phase 2 — Media domain + persistence

- [x] `media-asset.entity.ts`
- [x] `media-asset.repository.ts` — interface + `MediaAssetNotFoundError`
- [x] `prisma-media.repository.ts` + spec
- [x] **Checkpoint 2:** repository spec green

## Phase 3 — Media application services

- [x] `image-dimensions.util.ts` + spec
- [x] `upload-media.service.ts` + spec
- [x] `list-media.service.ts` + spec
- [x] `delete-media.service.ts` + spec
- [x] **Checkpoint 3:** service specs green

## Phase 4 — Media presentation + wiring

- [x] `media.controller.ts`
- [x] `media.module.ts`
- [x] `app.module.ts` — register `StorageModule`, `MediaModule`
- [x] `seed-default-data.service.ts` — add `media:manager`/`media:read`
- [x] `seed-default-data.service.spec.ts` — update counts/slugs
- [x] **Checkpoint 4:** build/typecheck/lint/test:cov all clean — commit

## Phase 5 — Test infra + e2e

- [x] `test/utils/noop-storage.adapter.ts`
- [x] `test/utils/app-test.util.ts`
- [x] `test/media.e2e-spec.ts` (11/11 passing against the user's Postgres)
- [x] **Checkpoint 5:** `bun run test:e2e` green (11/11) — required granting `media:manager`/
      `media:read` to the user's pre-existing `super_admin`/`admin` roles via `PUT /api/roles/:id`
      first (expected: `SeedDefaultDataService` doesn't retroactively sync permissions onto roles
      that already existed before this cycle).

## Phase 6 — Docs

- [x] `docs/documents/media.md`
- [x] `docs/documents/storage.md`
- [x] `docs/ENTRYPOINT.md` — add index lines
- [x] `SPEC.md` — trim to pointer line
- [x] **Checkpoint 6:** doc read-through — commit

## Phase 7 — Manual verification (non-blocking for Phase 4/6 commits)

- [ ] User sets real `AWS_REGION`/`AWS_S3_BUCKET`/`CLOUDINARY_*`/`STORAGE_PROVIDER` in their own
      `.env`
- [ ] User confirms upload → list → delete against a real provider
- [ ] User confirms e2e suite against their own reachable Postgres, if it couldn't run here
