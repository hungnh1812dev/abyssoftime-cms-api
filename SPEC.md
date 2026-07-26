# Spec

## Active spec: Media Module + Storage Module (Go → NestJS/Prisma conversion)

Port the Go/GORM `media` and `storage` modules to this codebase's NestJS/Prisma/module-split
conventions, using the two provided Go-derived design docs as the behavioral source of truth
while conforming to this repo's own structural conventions where the two disagree (see
"Deviations from the source docs" below).

### Objective

Two new modules:

- **`storage`** (`src/modules/storage/`) — a `StorageAdapter` port with `S3StorageAdapter` and
  `CloudinaryStorageAdapter` implementations, bound behind a `LazyStorageAdapter` wrapper that
  defers provider selection/config resolution to first call (so unrelated e2e suites booting
  `AppModule` never need AWS/Cloudinary credentials). No controllers — pure service dependency
  consumed by `media`.
- **`media`** (`src/modules/media/`) — upload/list/delete of image assets. Upload validates size
  and PNG/JPEG dimensions before ever touching storage, stores the file via `StorageAdapter`,
  hashes it (SHA-256), and persists metadata via Prisma. Assets are immutable — no update route.

**Success looks like:** `POST /api/media/upload`, `GET /api/media`, `DELETE /api/media/:id` all
work end-to-end against a real Postgres DB with storage stubbed by `NoopStorageAdapter` in e2e,
and `STORAGE_PROVIDER=s3|cloudinary` genuinely switches the live adapter without touching
media's code.

### Deviations from the source docs (confirmed with the user)

The two docs pasted into this spec cycle describe the Go source's shape faithfully, but this
repo has its own established conventions for a few of the same concerns. Where they conflict,
this repo's convention wins:

1. **Primary key** — the docs' `gormId Int @id @default(autoincrement()) @map("gorm_id")` +
   `documentId String @unique` is inverted here to match `Permission`/`Role`/`AccessToken`/`User`:
   `documentId String @id @default(uuid()) @map("document_id")` is the real key; `id Int
   @default(autoincrement())` is a plain, unmapped legacy column (no `@id`, no `@unique`, no
   `gorm_id` name) — copy the exact shape already used by every other model in
   `prisma/postgresql/schema.prisma`.
2. **Guard/decorator naming** — this repo already has `PermissionsGuard` +
   `@RequirePermissions(...)` (plural), not the docs' `PermissionGuard`/`@RequirePermission`
   (singular). Use the existing plural names.
3. **Guard placement** — no controller in this codebase uses class-level `@UseGuards`/
   `@RequirePermissions`; every route repeats `@UseGuards(JwtAuthGuard, PermissionsGuard)` +
   `@RequirePermissions(...)` individually (see `role.controller.ts`). `MediaController` follows
   that same per-route pattern instead of the docs' class-level-plus-override shape. Functionally
   identical either way.
3a. **No `AuthModule` import** — `TokenModule` (which `JwtAuthGuard` depends on) is `@Global`, and
   no other module imports an `AuthModule` for its guards (see `role.module.ts`). `MediaModule`
   imports only `StorageModule`, not an `AuthModule` the docs mention but that isn't how guards
   are wired here.
4. **`MediaAssetNotFoundError` / P2025 translation** — not a deviation, just confirming fit: this
   exact pattern (a domain `*NotFoundError`, thrown by the Prisma repository on a caught `P2025`,
   translated to `NotFoundException` in the service) already exists verbatim as
   `RoleNotFoundError` in `role.repository.ts` / `prisma-role.repository.ts` /
   `delete-role.service.ts`. Copy that pattern exactly.
5. **Schema location** — only `prisma/postgresql/schema.prisma` carries real models (the
   `sqlite`/`mysql` schema files are stubs with no models, matching `DB_DRIVER` defaulting to
   `postgresql`). `MediaAsset` is added there only, with a new migration under
   `prisma/postgresql/migrations/`.

### New dependencies

- `@aws-sdk/client-s3` — S3 uploads/deletes.
- `cloudinary` — Cloudinary uploads/deletes.
- No `@types/multer` — `multer` itself ships transitively via `@nestjs/platform-express`
  (already in `node_modules`), and per the source doc `MediaController` hand-rolls its own
  `UploadedMulterFile` shape instead of depending on `@types/multer`.

### New environment variables

`MEDIA_MAX_UPLOAD_BYTES` already exists in `env.validation.ts` (default 10MB) — no change needed
there.

Per the source doc's explicit design decision, **`STORAGE_PROVIDER`, `AWS_REGION`,
`AWS_S3_BUCKET`, `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` are
deliberately NOT added to `env.validation.ts`** — `LazyStorageAdapter` reads them directly via
`ConfigService.get`/`getOrThrow` at first call, so a boot with none of them set (any e2e suite
that never touches media) never fails. I will not read/create/edit any `.env*` file (global
rule) — the user sets real values in their own `.env`.

### Commands

Unchanged project-wide (see `docs/rules/bun.md`):

```
Build:  bun run build
Test:   bun run test        (bun run test:cov for coverage)
E2E:    bun run test:e2e
Lint:   bun run lint
Dev:    bun run start:dev
Migrate: bun run prisma:migrate
```

New dependency install: `bun add @aws-sdk/client-s3 cloudinary`.

### Project Structure

```
src/modules/storage/
  storage.module.ts                              # single factory: STORAGE_ADAPTER -> new LazyStorageAdapter(config)
  domain/repositories/storage-adapter.repository.ts   # StorageAdapter, UploadFile, UploadResult, STORAGE_ADAPTER
  infrastructure/
    s3-storage.adapter.ts (+ .spec.ts)
    cloudinary-storage.adapter.ts (+ .spec.ts)
    lazy-storage.adapter.ts (+ .spec.ts)

src/modules/media/
  media.module.ts                                 # imports StorageModule only; binds MEDIA_ASSET_REPOSITORY -> PrismaMediaRepository
  domain/
    entities/media-asset.entity.ts
    repositories/media-asset.repository.ts         # IMediaAssetRepository, MEDIA_ASSET_REPOSITORY, MediaAssetNotFoundError
  application/
    dto/                                            # none needed — upload is multipart, delete/list take no body
    services/
      upload-media.service.ts (+ .spec.ts)
      list-media.service.ts (+ .spec.ts)
      delete-media.service.ts (+ .spec.ts)
    util/image-dimensions.util.ts (+ .spec.ts)
  infrastructure/persistence/prisma-media.repository.ts (+ .spec.ts)
  presentation/media.controller.ts

test/
  media.e2e-spec.ts
  utils/
    noop-storage.adapter.ts                        # test double: records uploads/deletes, failNextDelete()
    app-test.util.ts                                # bootTestApp(configureModule?) — new shared e2e helper (doesn't exist yet)

prisma/postgresql/
  schema.prisma                                     # + MediaAsset model
  migrations/<timestamp>_add_media_assets/          # new migration

src/config/
  # env.validation.ts unchanged — see "New environment variables" above

src/bootstrap/
  seed-default-data.service.ts                      # + media:read / media:manager permissions (see below)
  seed-default-data.service.spec.ts                  # counts/slug-array assertions updated accordingly

src/app.module.ts                                    # + StorageModule, MediaModule imports
```

`test/utils/app-test.util.ts` doesn't exist yet — this is new shared e2e infrastructure (not
media-specific) that `media.e2e-spec.ts` needs to `overrideProvider(STORAGE_ADAPTER,
NoopStorageAdapter)`. Existing `test/app.e2e-spec.ts` builds `TestingModule` inline instead; this
adds the first reusable helper. Flagging since it's new shared infra, not purely additive to one
module.

### Seed data (assumption — confirm below)

`seed-default-data.service.ts`'s `DEFAULT_PERMISSIONS` currently has 8 hard-coded entries and
`DEFAULT_ROLES` assigns subsets to `super_admin`/`admin`. Proposed addition, matching the
existing per-resource `:manager`/`:read` pairing:

```ts
{ slug: "media:manager", name: "Manage media", description: "Upload and delete media assets" },
{ slug: "media:read", name: "Read media", description: "View media assets" },
```

...added to `super_admin`'s permissions (`media:manager`) and `admin`'s (`media:read`), same as
every other resource pair. This touches `seed-default-data.service.spec.ts`'s hard-coded counts
(8→10 permissions) and slug-array assertions. **Flagging as an assumption, not a locked
decision** — say now if media permissions shouldn't be auto-granted to `admin`/`super_admin`.

### Code Style

Repository port + Prisma adapter, matching `role.repository.ts` / `prisma-role.repository.ts`
exactly:

```ts
export interface IMediaAssetRepository {
  create(data: CreateMediaAssetData): Promise<MediaAssetEntity>;
  findById(documentId: string): Promise<MediaAssetEntity | null>;
  findByDocumentId(documentId: string): Promise<MediaAssetEntity | null>;
  findAll(): Promise<MediaAssetEntity[]>;
  delete(documentId: string): Promise<void>; // throws MediaAssetNotFoundError on P2025
}
export const MEDIA_ASSET_REPOSITORY = Symbol("MEDIA_ASSET_REPOSITORY");

export class MediaAssetNotFoundError extends Error {
  constructor(documentId: string) {
    super(`Media asset "${documentId}" not found`);
    this.name = "MediaAssetNotFoundError";
  }
}
```

`DeleteMediaService`, copying `DeleteRoleService`'s existence-check-then-translate shape exactly
(this is the one place the storage-delete call stays deliberately uncaught, per the source doc):

```ts
async execute(documentId: string): Promise<void> {
  const asset = await this.mediaAssets.findById(documentId);
  if (!asset) throw new NotFoundException(`Media asset "${documentId}" not found`);

  await this.storage.delete(asset.publicId); // uncaught — a storage failure must not silently drop the DB row

  try {
    await this.mediaAssets.delete(documentId);
  } catch (error) {
    if (error instanceof MediaAssetNotFoundError) throw new NotFoundException(error.message);
    throw error;
  }
}
```

`LazyStorageAdapter`, `S3StorageAdapter`, `CloudinaryStorageAdapter`, and the PNG/JPEG dimension
sniffing utility are otherwise implemented exactly as specified in the two source docs pasted
into this cycle — no further deviation beyond the five items listed above.

### Testing Strategy

Jest, unit tests next to source (existing convention). Per-suite list from the source docs
applies as-is:

- `image-dimensions.util.spec.ts`, `upload-media.service.spec.ts`, `list-media.service.spec.ts`,
  `delete-media.service.spec.ts`, `prisma-media.repository.spec.ts`.
- `s3-storage.adapter.spec.ts`, `cloudinary-storage.adapter.spec.ts`,
  `lazy-storage.adapter.spec.ts`.
- `media.e2e-spec.ts` — real Postgres, `STORAGE_ADAPTER` overridden with `NoopStorageAdapter` via
  the new `bootTestApp` helper. Full scenario list per the source doc (upload success, 422
  non-image with storage never called, 403/401 per route, list reachable by `media:read`-only,
  delete removes both storage + DB row, forced storage-delete failure leaves DB row intact, 404,
  403 delete without `media:manager`).
- No `coverageThreshold` entries added (`package.json` currently has none at all for any module —
  opt-in only, per `docs/rules/workflow.md`'s coverage rule).
- No test performs a real AWS/Cloudinary network call — S3/Cloudinary SDK clients are mocked at
  the unit level; e2e never touches real storage.

### Boundaries

- **Always do:** copy `RoleNotFoundError`'s pattern exactly for `MediaAssetNotFoundError`; keep
  `StorageAdapter`'s port framework-free (no `Express.Multer.File`, no AWS/Cloudinary types
  leaking into the domain interface); run `bun run lint` / `bun run build` / `bun run test:cov`
  before any commit; run Prettier on all changed files; keep the storage-delete-before-DB-delete
  ordering in `DeleteMediaService` uncaught exactly as documented.
- **Ask first:** any schema change beyond the `MediaAsset` model itself; any change to
  `seed-default-data.service.ts`'s existing 8 permissions/4 roles (only additive); adding
  `coverageThreshold` entries; any dependency beyond `@aws-sdk/client-s3`/`cloudinary`; committing
  (per `docs/rules/workflow.md` — explicit yes/no with staged files + message shown, no
  `Co-Authored-By`).
- **Never do:** read/create/edit/delete any `.env*` file; add a try/catch around the
  storage-delete call in `DeleteMediaService`; add an update route for `MediaAsset`; commit real
  AWS/Cloudinary credentials anywhere in the repo; add `@types/multer` as a dependency.

### Success Criteria

- [ ] `MediaAsset` model added to `prisma/postgresql/schema.prisma` (existing PK convention) with
      a generated migration; `bun run prisma:generate` succeeds.
- [ ] `StorageModule` exports `STORAGE_ADAPTER` bound to `LazyStorageAdapter`; switching
      `STORAGE_PROVIDER` (`s3` default vs `cloudinary`) selects the right adapter, resolved lazily
      (no config read at construction).
- [ ] `MediaModule` wired into `AppModule`; `GET /api/media`, `POST /api/media/upload`,
      `DELETE /api/media/:id` all behave per the source doc's Business Rules (size/dimension
      checks before storage touch, storage-delete-before-DB-delete, `media:read`/`media:manager`
      permission gating).
- [ ] All listed unit + e2e suites pass; `bun run build`, `bunx tsc --noEmit`, `bunx eslint .`,
      `bun run test:cov` all clean.
- [ ] No test performs a real AWS/Cloudinary network call.
- [ ] `docs/documents/media.md` and `docs/documents/storage.md` written (mirroring the source
      docs, corrected for the deviations above) once implementation lands.
- [ ] `SPEC.md` trimmed back to a pointer line once the above docs fully capture the end state.

### Open Questions

- **Seed data assumption** (see "Seed data" above) — confirm `media:manager` → `super_admin`,
  `media:read` → `admin` is the right default grant, or say otherwise.
- Everything else (PK convention, storage-adapter scope) was resolved directly with the user
  during this Spec phase.
