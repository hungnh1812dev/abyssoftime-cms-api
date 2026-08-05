# Media flow — upload / list / delete

Scope: the media module's three operations and how the storage adapter is resolved.
Read directly from `src/modules/media/**` and `src/modules/storage/**` — not inferred.
Cross-referenced against `docs/documents/media.md` and `docs/documents/storage.md` for
narrative context only.

## Diagram A — upload

```mermaid
sequenceDiagram
    participant C as Client
    participant Guard as JwtAuthGuard + PermissionsGuard
    participant Ctl as MediaController
    participant Svc as UploadMediaService
    participant Dim as image-dimensions util
    participant Storage as StorageAdapter port
    participant Repo as IMediaAssetRepository

    C->>Guard: POST media/upload, multipart, requires media:manager
    Guard->>Ctl: authorized
    Ctl->>Ctl: FileInterceptor buffers file in memory, memoryStorage, no disk write
    Note over Ctl: no @types/multer — file typed via hand-rolled\nUploadedMulterFile interface
    alt no file provided
        Ctl-->>C: 400 BadRequestException
    else file present
        Ctl->>Svc: execute buffer, fileName, mimeType, uploadedBy
        Svc->>Svc: 1. size check against MEDIA_MAX_UPLOAD_BYTES
        alt oversized
            Svc-->>C: 413 PayloadTooLargeException
        else within limit
            Svc->>Dim: 2. getImageDimensions(buffer), sniffs PNG/JPEG magic bytes
            alt unsupported format
                Dim-->>Svc: UnsupportedImageFormatError
                Svc-->>C: 422 UnprocessableEntityException
            else recognized
                Dim-->>Svc: width, height, canonical format
                Note over Svc: canonical mimeType/extension come from the sniffed\nformat, not the caller-supplied values — anti-spoofing
                Svc->>Storage: 3. upload buffer, storageFileName, canonicalMimeType
                Storage-->>Svc: url, thumbnailUrl, publicId
                Note over Storage: uncaught — adapter errors propagate as an\nunhandled 500, nothing persisted yet
                Svc->>Svc: 4. sha256 hash of the original buffer, node:crypto
                Svc->>Repo: 5. create fileName/mimeType/size/width/height/url/thumbnailUrl/publicId/hash/uploadedBy
                Note over Repo: uncaught — DB failure here orphans the\nalready-uploaded storage object, no compensating delete
                Repo-->>Svc: MediaAssetEntity
                Svc-->>C: 201 MediaAssetEntity
            end
        end
    end
```

## Diagram B — list

```mermaid
flowchart LR
    A["GET /media<br/>requires media:read"] --> B["ListMediaService.execute()"]
    B --> C["mediaAssets.findAll()<br/>Prisma findMany, orderBy createdAt desc"]
    C --> D["200, array of MediaAssetEntity"]
    E["no query params —\nno filter, no pagination"] -.-> B
```

## Diagram C — delete

```mermaid
sequenceDiagram
    participant C as Client
    participant Guard as JwtAuthGuard + PermissionsGuard
    participant Svc as DeleteMediaService
    participant Storage as StorageAdapter port
    participant Repo as IMediaAssetRepository

    C->>Guard: DELETE media/:id, requires media:manager
    Guard->>Svc: authorized
    Svc->>Repo: findById(documentId)
    alt not found
        Repo-->>C: 404 NotFoundException
    else found
        Repo-->>Svc: asset
        Svc->>Storage: delete(asset.publicId), storage delete happens FIRST
        Note over Storage: not wrapped in try/catch — a throw here propagates\nunhandled as a 500, and the DB row is left untouched,\nnow pointing at storage that no longer exists
        Storage-->>Svc: ok
        Svc->>Repo: delete(documentId), DB delete SECOND
        alt Prisma P2025, record already gone
            Repo-->>Svc: MediaAssetNotFoundError
            Svc-->>C: 404
        else other DB error
            Repo-->>Svc: rethrown unhandled
            Svc-->>C: 500, no rollback of the already-deleted storage object
        else success
            Repo-->>Svc: ok
            Svc-->>C: 204 No Content
        end
    end
```

## Diagram D — storage adapter resolution

```mermaid
flowchart TD
    A["StorageModule binds STORAGE_ADAPTER token\nto new LazyStorageAdapter(configService)"] --> B["first upload() or delete() call"]
    B --> C["LazyStorageAdapter.resolve()"]
    C --> D{"already resolved and cached?"}
    D -- yes --> E["reuse cached concrete adapter"]
    D -- no --> F["createAdapter(): read STORAGE_PROVIDER,\ndefaults to cloudinary if unset"]
    F --> G{"STORAGE_PROVIDER == s3?"}
    G -- yes --> H["S3StorageAdapter\nrequires AWS_REGION, AWS_S3_BUCKET\ngetOrThrow — missing env throws on first use, not at boot"]
    G -- no --> I["CloudinaryStorageAdapter\nrequires CLOUDINARY_CLOUD_NAME/API_KEY/API_SECRET\ngetOrThrow — missing env throws on first use, not at boot"]
    H --> E
    I --> E
```

## Notes

- Confirmed exact upload ordering: **size → dimension → storage → hash → persist**.
- S3 adapter: randomized key, `PutObjectCommand`/`DeleteObjectCommand`; `url` and
  `thumbnailUrl` are identical (no real thumbnail generation).
- Cloudinary adapter: base64 data-URI upload with an eager 200×200 thumbnail transform;
  `thumbnailUrl` falls back to `secure_url` if the eager transform result is absent.

Sources read: `src/modules/media/presentation/media.controller.ts`,
`src/modules/media/application/services/upload-media.service.ts`,
`src/modules/media/application/services/list-media.service.ts`,
`src/modules/media/application/services/delete-media.service.ts`,
`src/modules/media/infrastructure/persistence/prisma-media.repository.ts`,
`src/modules/media/application/support/image-dimensions.util.ts`,
`src/modules/storage/storage.module.ts`,
`src/modules/storage/infrastructure/lazy-storage.adapter.ts`,
`src/modules/storage/infrastructure/s3-storage.adapter.ts`,
`src/modules/storage/infrastructure/cloudinary-storage.adapter.ts`.
