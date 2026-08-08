# Permissions Module

`src/modules/permissions/**` — clean-architecture module for managing permission records (slug-based capability grants consumed by `roles`). Fully wired: registered in `AppModule`, all CRUD routes live, Prisma-backed, and guarded by real JWT + permission-slug authorization (see [Endpoints](#endpoints)).

## Entity

`domain/entities/permission.entity.ts` — `PermissionEntity`:

| Field         | Type                  |
| ------------- | --------------------- |
| `documentId`  | `string`              |
| `slug`        | `string`              |
| `name`        | `string`              |
| `description` | `string \| undefined` |
| `createdAt`   | `Date`                |
| `updatedAt`   | `Date`                |
| `updatedBy`   | `string`              |

Maps 1:1 to the `Permission` Prisma model (`prisma/postgresql/schema.prisma`); the `user` relation (`updatedBy` FK to `User.documentId`) is not exposed on the entity itself.

## Repository

`domain/repositories/permission.repository.ts` — interface `IPermissionRepository`, DI token `PERMISSSION_REPOSITORY` (constant name has a 3-S typo; the `Symbol` description string is spelled correctly).

- `findAll(): Promise<PermissionEntity[]>`
- `findBySlug(slug): Promise<PermissionEntity | null>`
- `findByIds(documentIds): Promise<PermissionEntity[]>`
- `create(data: CreatePermissionData): Promise<PermissionEntity>`
- `update(documentId, data: UpdatePermissionData): Promise<PermissionEntity>`
- `delete(documentId): Promise<void>`
- `countReferences(slug): Promise<{ roleCount: number; accessTokenCount: number }>`

Implementation: `infrastructure/persistence/prisma-permission.repository.ts` (`PrismaPermissionRepository`). `countReferences` runs `prisma.role.count(...)` and `prisma.accessToken.count(...)` in parallel via `Promise.all`, both using `{ where: { permissions: { array_contains: [slug] } } }` — since both `Role.permissions` and `AccessToken.permissions` are raw JSON arrays (no join table). See [access-tokens.md](./access-tokens.md) for the access-token side.

## DTOs

`create-permission.dto.ts`:

- `slug` — `@IsString()`, `@Matches(/^[a-z][a-z0-9_]*:[a-z][a-z0-9_]*$/)` (format `resource:action`, e.g. `document:read`)
- `name` — `@IsString() @IsNotEmpty()`
- `description` — `@IsString() @IsNotEmpty()`

`update-permission.dto.ts` — same fields, all `@IsOptional()`; `description` drops the `@IsNotEmpty()` constraint.

## System-managed scoped permission rows

Not every row in the `Permission` table is created through this module's `POST /permissions` endpoint (and its 2-segment `resource:action` slug regex above). `content-type`'s `DocumentPermissionSyncService` (see [content-type.md](content-type.md#document-permission-catalog-sync)) writes a 3-segment `document:<action>:<content-type-slug>` row per content type × document action directly via `IPermissionRepository.create()` at boot, bypassing `CreatePermissionDto` entirely — these rows are system-managed (derived from `content-types/*.json`), not admin-authored, so the public regex is deliberately **not** loosened to accept a 3rd segment. An admin can still see them via `GET /api/v1/permissions` like any other row (no filtering), but `PUT`/`DELETE` on one goes through the normal `UpdatePermissionService`/`DeletePermissionService` path same as any row — nothing prevents an admin from renaming or deleting a scoped row today; a future re-sync only re-creates a deleted one (`findBySlug`-guarded, idempotent), it doesn't guard against manual edits mid-flight.

## Services & business rules

All four services inject `@Inject(PERMISSSION_REPOSITORY)`.

- **Create** — `409 ConflictException` if `slug` already exists. `updatedBy` is hardcoded to `""` (no authenticated-caller wiring yet).
- **Update** — `404 NotFoundException` if `documentId` not found. `updatedBy` hardcoded to `""`.
- **Delete** — `404` if not found; `409 ConflictException` (with `{ message, roleCount, accessTokenCount }` body) if `roleCount > 0 || accessTokenCount` is truthy.
- **List** — passthrough `findAll()`.

## Endpoints

`presentation/permission.controller.ts`, `@Controller("/api/v1/permissions")`. Every route is guarded by `JwtAuthGuard` + `PermissionsGuard` (`src/common/guards/`), which validate the `Authorization: Bearer` access token (or a long-lived API token, see [access-tokens.md](./access-tokens.md)) and check `req.user.permissions` against each route's `@RequirePermissions` metadata (read-implies-manager):

| Method   | Path                         | Service                   | Required permission        |
| -------- | ---------------------------- | ------------------------- | --------------------------- |
| `GET`    | `/api/v1/permissions`           | `ListPermissionService`   | `permission:read`           |
| `POST`   | `/api/v1/permissions`           | `CreatePermissionService` | `permission:manager`        |
| `PUT`    | `/api/v1/permissions/:id`       | `UpdatePermissionService` | `permission:manager`        |
| `DELETE` | `/api/v1/permissions/:id` (204) | `DeletePermissionService` | `permission:manager`        |

None of the four services take a caller parameter or perform authorization themselves — that's entirely the guards' job at the controller layer, same pattern as `roles` and `users`.

## Module wiring

`permission.module.ts` registers the controller, all four services, and binds `PERMISSSION_REPOSITORY → PrismaPermissionRepository`. Imported into `src/app.module.ts`.

## Known quirks

- `PERMISSSION_REPOSITORY` constant is misspelled (three S's) — kept as-is per project convention (don't fix typos as unrequested cleanup).
- `updatedBy` is always `""` on create/update — no caller-identity plumbing exists yet.

## Tests

Unit tests (Jest, mocked repository, ≥80% branch coverage) live next to each source file: `create-permission.service.spec.ts`, `update-permission.service.spec.ts`, `delete-permission.service.spec.ts`, `list-permission.service.spec.ts`, `permission.controller.spec.ts` (provides a mocked `JwtTokenService` so the testing module can instantiate `JwtAuthGuard`, referenced via `@UseGuards`), `prisma-permission.repository.spec.ts`.

## Verified state (2026-07-24)

`bun run build`, `bunx tsc --noEmit`, `bunx eslint`, and `bun run test:cov` all pass with zero errors for this module. `countReferences`'s `accessTokenCount` fix (real query, no longer hardcoded `0`) verified live against a real access token.
