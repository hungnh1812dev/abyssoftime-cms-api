# Plan: Media Module + Storage Module (Go → NestJS/Prisma conversion)

See `SPEC.md` for the active spec. This plan ports the Go/GORM `media` and `storage` modules into
this repo's NestJS/Prisma/module-split conventions, following the five deviations from the source
docs confirmed with the user during the Spec phase (PK convention, guard naming, per-route guards,
no `AuthModule` import, schema-location). This is a new capability, not a refactor: no existing
module's behavior changes except two additive edits (`seed-default-data.service.ts`,
`app.module.ts`).

## Context

`storage` has to exist before `media` can depend on it (media's `UploadMediaService`/
`DeleteMediaService` take `StorageAdapter` as a constructor dependency). The Prisma schema/
migration has to exist before `PrismaMediaRepository` can be implemented against a generated
client. Test infra (`NoopStorageAdapter`, `bootTestApp`) has to exist before `media.e2e-spec.ts`
can run. Tasks are ordered along that dependency chain: storage (self-contained vertical slice) →
media domain/persistence → media application services → media presentation/wiring → test infra/e2e
→ docs.

## Key files

- `src/modules/roles/domain/repositories/role.repository.ts`,
  `src/modules/roles/infrastructure/persistence/prisma-role.repository.ts`,
  `src/modules/roles/application/services/delete-role.service.ts` — the repository+domain-error
  shape to copy exactly for `MediaAssetNotFoundError` (P2025 → domain error → `NotFoundException`).
- `src/modules/access-tokens/presentation/access-token.controller.ts`,
  `src/modules/access-tokens/access-token.module.ts` — controller/module/DI wiring pattern
  (per-route `@UseGuards(JwtAuthGuard, PermissionsGuard)` + `@RequirePermissions(...)`, no
  `AuthModule`/`PrismaModule` import needed since `TokenModule`/`PrismaModule` are both `@Global`).
- `src/modules/access-tokens/application/services/access-token-secret.util.ts` — the existing
  `import { createHash } from "node:crypto"` + `createHash("sha256").update(...).digest("hex")`
  pattern to copy for the upload hash.
- `src/common/guards/rate-limit.guard.ts` vs `src/config/env.validation.ts` — contrast: this is
  the typed `ConfigService<EnvironmentVariables, true>` + `{ infer: true }` pattern, which does
  **not** apply to `LazyStorageAdapter`'s `STORAGE_PROVIDER`/`AWS_*`/`CLOUDINARY_*` reads (those
  vars are deliberately absent from `EnvironmentVariables` — plain untyped `ConfigService.get`/
  `getOrThrow` instead, first use of `getOrThrow` in the repo).
- `test/app.e2e-spec.ts`, `src/bootstrap/configure-app.ts` — the existing e2e boot is bare
  (`Test.createTestingModule({imports:[AppModule]}).compile()`, no `configureApp` call, so no
  `ValidationPipe`/`cookie-parser`). The new `test/utils/app-test.util.ts` must call
  `configureApp(app)` so cookie-based `JwtAuthGuard` and multipart validation actually work —
  copying `app.e2e-spec.ts`'s pattern verbatim would silently break auth in the new e2e suite.

## Confirmed decisions (resolved with the user during the Spec phase)

1. `MediaAsset.documentId String @id @default(uuid())` is the real key; `id Int
@default(autoincrement())` is a plain unmapped legacy column — matches every other model in
   `prisma/postgresql/schema.prisma`, not the source doc's `gormId`-as-`@id` shape.
2. Both `S3StorageAdapter` and `CloudinaryStorageAdapter` built now, behind `LazyStorageAdapter`
   (new deps: `@aws-sdk/client-s3`, `cloudinary`).
3. Guards: `PermissionsGuard` + `@RequirePermissions(...)` (existing plural names), per-route, not
   class-level; `MediaModule` imports only `StorageModule`.
4. Multer needs `FileInterceptor("file", { storage: memoryStorage() })` explicitly — default
   multer writes to disk, but `UploadMediaService` needs `file.buffer` for hashing/dimension
   sniffing. No `@types/multer` — hand-rolled local `UploadedMulterFile` interface instead.
5. No e2e-capable Postgres is confirmed reachable in this environment yet — `media.e2e-spec.ts`
   will be the first DB-backed e2e test in this repo, and `bun run prisma:migrate` (Phase 0) also
   needs a reachable Postgres. If unreachable, both stop and become a flagged, non-blocking user
   action rather than being faked or silently skipped — unit-level work (Phase 0's schema edit
   through Phase 4) proceeds regardless.

## Tasks

### Phase 0 — Dependencies + Schema

- [x] `bun add @aws-sdk/client-s3 cloudinary`
- [x] `prisma/postgresql/schema.prisma` — add `MediaAsset` model per decision #1. Field set
      (`fileName`, `mimeType`, `size`, `width`, `height`, `url`, `thumbnailUrl`, `publicId`,
      `hash`, `uploadedBy`) is a **best-guess inference** from `SPEC.md`'s scattered clues
      (`asset.publicId`, SHA-256 hashing, PNG/JPEG dimension checks) — the original source docs'
      exact column list wasn't preserved in the repo. Confirmed with the user to proceed this way;
      flag for review once the doc-writing phase (Phase 6) compares against the real source docs
      if the user has them on hand again.
- [x] `bun run prisma:migrate` — generated and applied
      `prisma/postgresql/migrations/20260726074800_add_media_assets/`
- [x] `bun run prisma:generate` — `MediaAsset` present in generated client
- [x] **Checkpoint 0:** `bun run build` succeeds with `MediaAsset` in the generated client

### Phase 1 — Storage module

- [x] `domain/repositories/storage-adapter.repository.ts` — `StorageAdapter`, `UploadFile`,
      `UploadResult`, `STORAGE_ADAPTER` (zero framework imports)
- [x] `infrastructure/s3-storage.adapter.ts` + `.spec.ts` — `PutObjectCommand` upload,
      `sanitizeFileNameStem`, virtual-hosted URL, `thumbnailUrl === url`, `DeleteObjectCommand`
- [x] `infrastructure/cloudinary-storage.adapter.ts` + `.spec.ts` — base64 data-URI upload with
      eager thumbnail, `client.uploader.destroy(publicId)`
- [x] `infrastructure/lazy-storage.adapter.ts` + `.spec.ts` — deferred provider selection
- [x] `storage.module.ts` — factory provider, exports `STORAGE_ADAPTER`
- [x] **Checkpoint 1:** `bun run test storage` green, `bun run build` clean

### Phase 2 — Media domain + persistence

- [x] `domain/entities/media-asset.entity.ts`
- [x] `domain/repositories/media-asset.repository.ts` — `IMediaAssetRepository`,
      `MEDIA_ASSET_REPOSITORY`, `MediaAssetNotFoundError`
- [x] `infrastructure/persistence/prisma-media.repository.ts` + `.spec.ts` — P2025-catch on
      delete, `findAll` ordered `createdAt desc`
- [x] **Checkpoint 2:** `bun run test prisma-media` green

### Phase 3 — Media application services

- [x] `application/util/image-dimensions.util.ts` + `.spec.ts` — PNG/JPEG sniffing (independent
      pure function)
- [x] `application/services/upload-media.service.ts` + `.spec.ts` — size → dimension → storage
      upload → hash → create, in order
- [x] `application/services/list-media.service.ts` + `.spec.ts`
- [x] `application/services/delete-media.service.ts` + `.spec.ts` — storage-then-DB, uncaught on
      storage failure
- [x] **Checkpoint 3:** `bun run test media/application` green

### Phase 4 — Media presentation + wiring

- [x] `presentation/media.controller.ts` — `@Controller("api/media")`, per-route guards
- [x] `media.module.ts` — imports `[StorageModule]` only
- [x] `src/app.module.ts` — add `StorageModule`, `MediaModule`
- [x] `seed-default-data.service.ts` — add `media:manager`/`media:read`; grant to
      `super_admin`/`admin` respectively
- [x] `seed-default-data.service.spec.ts` — update counts/slug-array assertions
- [x] **Checkpoint 4:** `bun run build`, `bunx tsc --noEmit`, `bunx eslint .`, `bun run test:cov`
      all clean — **commit here** (automated checkpoint; Phase 5's DB-dependent work doesn't
      block it)

### Phase 5 — Test infra + e2e

- [x] `test/utils/noop-storage.adapter.ts` — records uploads/deletes, `failNextDelete()`
- [x] `test/utils/app-test.util.ts` — `bootTestApp(configureModule?)`, calls `configureApp`
- [x] `test/media.e2e-spec.ts` — full scenario list (see `SPEC.md` Testing Strategy): 401
      unauthenticated, upload success (media:manager), 422 non-image with storage untouched, 403
      upload without media:manager, list reachable by media:read-only, delete removes storage +
      DB row, 403 delete without media:manager, 404 delete unknown id, forced storage-delete
      failure (`NoopStorageAdapter.failNextDelete()`) leaves the DB row intact. Users/tokens are
      created directly via `PrismaService` + `JwtTokenService.signAccessToken(...)` against the
      seeded `super_admin`/`admin` roles (`JwtAuthGuard` never touches the DB — it just verifies
      the JWT — so no HTTP register/verify-otp/login round-trip is needed); `runId` suffix on
      email/username avoids collisions with leftover rows from a prior incomplete run.
- [x] **Checkpoint 5:** `bun run test:e2e` green against reachable Postgres — confirmed green
      (11/11) once the user pointed `.env.local`/`.env.test.local` at a reachable Postgres. Getting
      there required one out-of-band fix: the user's dev DB had `super_admin`/`admin` roles
      pre-dating the `media:manager`/`media:read` permission additions, and `SeedDefaultDataService`
      only seeds a role if it doesn't already exist (no retroactive permission sync onto existing
      roles — see `docs/documents/media.md`'s "Permissions catalog additions" note). Granted via two
      real `PUT /api/roles/:id` calls (through the actual guarded HTTP endpoint, not a direct DB
      write) — not a code defect, this is the documented, expected behavior for any DB seeded before
      this cycle.

### Phase 6 — Docs

- [x] `docs/documents/media.md`, `docs/documents/storage.md` — mirror the source docs, corrected
      for the confirmed deviations
- [x] `docs/ENTRYPOINT.md` — add the two new index lines
- [x] `SPEC.md` — trim to a pointer line
- [x] **Checkpoint 6:** doc read-through — commit

### Phase 7 — Manual verification (non-blocking for Phase 4/6 commits)

- [x] User set real `CLOUDINARY_CLOUD_NAME`/`CLOUDINARY_API_KEY`/`CLOUDINARY_API_SECRET` in their
      own `.env.local` (default `STORAGE_PROVIDER=cloudinary`; S3 path not exercised — `LazyStorageAdapter`'s
      provider branching is already unit-tested, so this was about proving the Cloudinary path and
      the app's env-loading end-to-end, not re-testing the branch itself)
- [x] Live walkthrough against `bun run start:dev` + real Cloudinary: `POST /api/media/upload` →
      `201` with a real `res.cloudinary.com` URL (independently fetched, `200`); `GET /api/media` →
      `200`; `DELETE /api/media/:id` → `204`, DB row gone, Cloudinary URL now `404` (the object was
      actually deleted, not just the DB row — closes the loop on `DeleteMediaService`'s
      storage-then-DB ordering against a real provider, not just `NoopStorageAdapter`). One dead end
      on the way: the first upload attempt against a hand-crafted PNG (header-only, no real pixel
      data) got a real `400 Invalid image file` from Cloudinary — proved credentials/wiring were
      already correct, fixed by using a genuinely valid 1×1 PNG. A synthetic JWT `sub` not backed by
      a real `User` row also 500'd on `media_assets_uploaded_by_fkey` (FK violation) until a real
      user was created for the token. Verification user/JWT were temporary and cleaned up afterward.
- [x] User confirms Phase 5's e2e suite against their own reachable Postgres — done, see Phase 5
      Checkpoint 5

## Verification (end-to-end)

1. `bun run build && bunx tsc --noEmit && bunx eslint . && bun run test:cov` — all green.
2. `bun run test:e2e` — `media.e2e-spec.ts` green against real Postgres, storage stubbed by
   `NoopStorageAdapter`.
3. No test performs a real AWS/Cloudinary network call.
4. Manual (Phase 7, user-performed): real upload/list/delete confirmed against one real provider.
