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
- [ ] `media-asset.entity.ts`
- [ ] `media-asset.repository.ts` — interface + `MediaAssetNotFoundError`
- [ ] `prisma-media.repository.ts` + spec
- [ ] **Checkpoint 2:** repository spec green

## Phase 3 — Media application services
- [ ] `image-dimensions.util.ts` + spec
- [ ] `upload-media.service.ts` + spec
- [ ] `list-media.service.ts` + spec
- [ ] `delete-media.service.ts` + spec
- [ ] **Checkpoint 3:** service specs green

## Phase 4 — Media presentation + wiring
- [ ] `media.controller.ts`
- [ ] `media.module.ts`
- [ ] `app.module.ts` — register `StorageModule`, `MediaModule`
- [ ] `seed-default-data.service.ts` — add `media:manager`/`media:read`
- [ ] `seed-default-data.service.spec.ts` — update counts/slugs
- [ ] **Checkpoint 4:** build/typecheck/lint/test:cov all clean — commit

## Phase 5 — Test infra + e2e
- [ ] `test/utils/noop-storage.adapter.ts`
- [ ] `test/utils/app-test.util.ts`
- [ ] `test/media.e2e-spec.ts`
- [ ] **Checkpoint 5:** `bun run test:e2e` green — commit, or flag as pending if no DB reachable

## Phase 6 — Docs
- [ ] `docs/documents/media.md`
- [ ] `docs/documents/storage.md`
- [ ] `docs/ENTRYPOINT.md` — add index lines
- [ ] `SPEC.md` — trim to pointer line
- [ ] **Checkpoint 6:** doc read-through — commit

## Phase 7 — Manual verification (non-blocking for Phase 4/6 commits)
- [ ] User sets real `AWS_REGION`/`AWS_S3_BUCKET`/`CLOUDINARY_*`/`STORAGE_PROVIDER` in their own
      `.env`
- [ ] User confirms upload → list → delete against a real provider
- [ ] User confirms e2e suite against their own reachable Postgres, if it couldn't run here
