# Storage Module

`src/modules/storage/**` — a `StorageAdapter` port with `S3StorageAdapter` and `CloudinaryStorageAdapter` implementations, bound behind a `LazyStorageAdapter` wrapper that defers provider selection/config resolution to first call. No controllers — pure service dependency, consumed by [`media`](media.md) (`MediaModule` imports `StorageModule` and injects `STORAGE_ADAPTER`).

The "lazy" part is load-bearing: `LazyStorageAdapter` reads no config in its constructor, so any e2e suite that boots `AppModule` without ever calling `/api/media/*` (i.e. every existing suite) never needs AWS/Cloudinary credentials to be set.

## Port

`domain/repositories/storage-adapter.repository.ts` — zero framework imports:

```ts
export interface UploadFile {
  buffer: Buffer;
  fileName: string;
  mimeType: string;
}

export interface UploadResult {
  url: string;
  thumbnailUrl: string;
  publicId: string;
}

export interface StorageAdapter {
  upload(file: UploadFile): Promise<UploadResult>;
  delete(publicId: string): Promise<void>;
}

export const STORAGE_ADAPTER = Symbol("STORAGE_ADAPTER");
```

`publicId` is the adapter-specific handle needed later to delete the object (S3 object key, Cloudinary public ID) — `media`'s `MediaAssetEntity` persists it for exactly that purpose.

## Adapters

### `S3StorageAdapter` (`infrastructure/s3-storage.adapter.ts`)

Constructed with `(region: string, bucket: string)`, builds its own `S3Client`.

- `upload`: derives a collision-resistant key `${randomBytes(8).toString("hex")}-${sanitizedStem}${ext}` (`extname` for the extension, `sanitizeFileNameStem` lowercases the rest, replaces any run of non-`[a-z0-9]` characters with a single hyphen, trims leading/trailing hyphens, and falls back to `"file"` if nothing safe remains), then `PutObjectCommand`. Returns a virtual-hosted-style URL (`https://${bucket}.s3.${region}.amazonaws.com/${key}`) as both `url` and `thumbnailUrl` — S3 has no built-in thumbnail generation, so the two are identical. `publicId` is the object key.
- `delete`: `DeleteObjectCommand` keyed by `publicId`.

`sanitizeFileNameStem` is exported standalone and unit-tested independently of the class.

### `CloudinaryStorageAdapter` (`infrastructure/cloudinary-storage.adapter.ts`)

Constructed with `(cloudName: string, apiKey: string, apiSecret: string)`, calls `cloudinary.config(...)` on the shared `v2` client immediately in the constructor.

- `upload`: encodes the buffer as a base64 data URI (`data:${mimeType};base64,${buffer.toString("base64")}`) and calls `cloudinary.uploader.upload(dataUri, { eager: [{ width: 200, height: 200, crop: "thumb" }] })` — Cloudinary generates the thumbnail server-side in the same request. `thumbnailUrl` reads `response.eager[0].secure_url`, falling back to `response.secure_url` if the eager transform result is absent. `publicId` is `response.public_id`.
- `delete`: `cloudinary.uploader.destroy(publicId)`.

### `LazyStorageAdapter` (`infrastructure/lazy-storage.adapter.ts`)

`@Injectable()`, constructor-injects only `ConfigService` — reads no env vars until the first `upload`/`delete` call:

1. `resolve()` memoizes: builds the concrete adapter once (`createAdapter()`), reuses it for every subsequent call.
2. `createAdapter()` reads `STORAGE_PROVIDER` via `configService.get<string>("STORAGE_PROVIDER") ?? "cloudinary"` — defaults to Cloudinary when unset (a deliberate fix; the source doc's original default was `s3`, but Cloudinary needs no AWS account to try locally).
   - `"s3"` → `new S3StorageAdapter(configService.getOrThrow("AWS_REGION"), configService.getOrThrow("AWS_S3_BUCKET"))`.
   - anything else (including unset) → `new CloudinaryStorageAdapter(configService.getOrThrow("CLOUDINARY_CLOUD_NAME"), configService.getOrThrow("CLOUDINARY_API_KEY"), configService.getOrThrow("CLOUDINARY_API_SECRET"))`.

`getOrThrow` (not `get`) on the provider-specific vars means a real upload/delete call throws immediately with a clear "config key not found" error if the selected provider's credentials aren't set — instead of silently constructing a broken client.

## `STORAGE_PROVIDER`, `AWS_*`, `CLOUDINARY_*` are deliberately untyped

Unlike `src/config/env.validation.ts`'s `EnvironmentVariables` (the typed `ConfigService<EnvironmentVariables, true>` + `{ infer: true }` pattern used everywhere else in this repo, e.g. `RateLimitGuard`), `STORAGE_PROVIDER`/`AWS_REGION`/`AWS_S3_BUCKET`/`CLOUDINARY_CLOUD_NAME`/`CLOUDINARY_API_KEY`/`CLOUDINARY_API_SECRET` are **not** added to `EnvironmentVariables` — `LazyStorageAdapter` injects the plain untyped `ConfigService` instead. This is deliberate: adding them as required fields to `EnvironmentVariables` would fail app boot (including every e2e suite, which builds the real `AppModule`) whenever they're unset, defeating the entire point of deferring resolution to first call. First use of `getOrThrow` in this repo.

No `.env*` file was read, created, or edited to add these — per project rule, the user sets real values in their own `.env`.

## Module wiring

`storage.module.ts` — single factory provider, no controllers:

```ts
@Module({
  providers: [
    {
      provide: STORAGE_ADAPTER,
      useFactory: (configService: ConfigService) => new LazyStorageAdapter(configService),
      inject: [ConfigService],
    },
  ],
  exports: [STORAGE_ADAPTER],
})
export class StorageModule {}
```

Any module that needs storage (currently only `MediaModule`) adds `StorageModule` to its `imports` and `@Inject(STORAGE_ADAPTER)`s the port type — never a concrete adapter class.

## New dependencies

`@aws-sdk/client-s3` and `cloudinary` (`bun add @aws-sdk/client-s3 cloudinary`). No `@types/multer` — see [`media.md`](media.md#no-typesmulter).

## Tests

Unit tests (Jest) live next to each source file, all mocking the underlying SDK client:

- `s3-storage.adapter.spec.ts` — `sanitizeFileNameStem` (lowercasing/hyphenation/trimming/fallback) tested standalone; `S3StorageAdapter` tested for `PutObjectCommand` upload shape + matching `url`/`thumbnailUrl`, and `DeleteObjectCommand` keyed by `publicId`.
- `cloudinary-storage.adapter.spec.ts` — constructor configures the client from credentials; upload sends the base64 data URI with the eager thumbnail transform and maps `url`/`thumbnailUrl`/`publicId` from the response; falls back to `secure_url` when no eager result is present; delete calls `client.uploader.destroy(publicId)`.
- `lazy-storage.adapter.spec.ts` — reads no config at construction; resolves `CloudinaryStorageAdapter` by default when `STORAGE_PROVIDER` is unset; resolves `S3StorageAdapter` when `STORAGE_PROVIDER=s3`; resolves the concrete adapter only once and reuses it across calls (memoization).
- `storage.module.spec.ts` — registers a single `STORAGE_ADAPTER` factory provider injected with `ConfigService`; the factory builds a `LazyStorageAdapter`; `STORAGE_ADAPTER` is exported.

No test performs a real AWS/Cloudinary network call — the SDK clients are mocked at the unit level; `test/media.e2e-spec.ts` overrides `STORAGE_ADAPTER` with `NoopStorageAdapter` (see [`media.md`](media.md#tests)) so no real storage call happens in e2e either. Per project rule, no `coverageThreshold` entries were added.

## Known quirks / deviations (preserved intentionally)

- `S3StorageAdapter.upload`/`CloudinaryStorageAdapter.upload` set `thumbnailUrl === url` only for S3 (no server-side thumbnail generation); Cloudinary genuinely generates a distinct 200×200 thumbnail. This asymmetry is inherent to the two providers, not a bug to reconcile.
- `LazyStorageAdapter` has no way to force re-resolution (e.g. if `STORAGE_PROVIDER` changes at runtime) — the memoized adapter lives for the lifetime of the Nest application instance, matching the source doc's design (config is expected to be static per deployment).
