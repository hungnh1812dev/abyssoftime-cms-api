# Permissions Module

`src/modules/permissions/**` — clean-architecture module for managing permission records (slug-based capability grants consumed by `roles`). Fully wired: registered in `AppModule`, all CRUD routes live, Prisma-backed.

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

Implementation: `infrastructure/persistence/prisma-permission.repository.ts` (`PrismaPermissionRepository`). `countReferences` queries `prisma.role.count({ where: { permissions: { array_contains: [slug] } } })` — since `Role.permissions` is a raw JSON array (no join table), and hardcodes `accessTokenCount: 0` (no access-token model exists yet).

## DTOs

`create-permission.dto.ts`:

- `slug` — `@IsString()`, `@Matches(/^[a-z][a-z0-9_]*:[a-z][a-z0-9_]*$/)` (format `resource:action`, e.g. `document:read`)
- `name` — `@IsString() @IsNotEmpty()`
- `description` — `@IsString() @IsNotEmpty()`

`update-permission.dto.ts` — same fields, all `@IsOptional()`; `description` drops the `@IsNotEmpty()` constraint.

## Services & business rules

All four services inject `@Inject(PERMISSSION_REPOSITORY)`.

- **Create** — `409 ConflictException` if `slug` already exists. `updatedBy` is hardcoded to `""` (no authenticated-caller wiring yet).
- **Update** — `404 NotFoundException` if `documentId` not found. `updatedBy` hardcoded to `""`.
- **Delete** — `404` if not found; `409 ConflictException` (with `{ message, roleCount, accessTokenCount }` body) if `roleCount > 0 || accessTokenCount` is truthy.
- **List** — passthrough `findAll()`.

## Endpoints

`presentation/permission.controller.ts`, `@Controller("/api/permissions")`:

| Method   | Path                         | Service                   |
| -------- | ---------------------------- | ------------------------- |
| `GET`    | `/api/permissions`           | `ListPermissionService`   |
| `POST`   | `/api/permissions`           | `CreatePermissionService` |
| `PUT`    | `/api/permissions/:id`       | `UpdatePermissionService` |
| `DELETE` | `/api/permissions/:id` (204) | `DeletePermissionService` |

## Module wiring

`permission.module.ts` registers the controller, all four services, and binds `PERMISSSION_REPOSITORY → PrismaPermissionRepository`. Imported into `src/app.module.ts`.

## Known quirks

- `PERMISSSION_REPOSITORY` constant is misspelled (three S's) — kept as-is per project convention (don't fix typos as unrequested cleanup).
- `updatedBy` is always `""` on create/update — no caller-identity plumbing exists yet.
- `accessTokenCount` in `countReferences` is a hardcoded `0` placeholder.

## Tests

Unit tests (Jest, mocked repository, ≥80% branch coverage) live next to each source file: `create-permission.service.spec.ts`, `update-permission.service.spec.ts`, `delete-permission.service.spec.ts`, `list-permission.service.spec.ts`, `permission.controller.spec.ts`, `prisma-permission.repository.spec.ts`.

## Verified state (2026-07-23)

`bun run build`, `bunx tsc --noEmit`, `bunx eslint`, and `bun run test` all pass with zero errors for this module.
