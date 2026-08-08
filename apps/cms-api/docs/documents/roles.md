# Roles Module

`src/modules/roles/**` — clean-architecture module for managing role records (name/slug/level/permission-set). **Fully wired into the running app**: `role.module.ts` registers Prisma-backed implementations for both `IRoleRepository` and `IUserRoleCountRepository`, and `RoleModule` is imported into `AppModule`. All four CRUD routes are HTTP-reachable, backed by the real database, and guarded by real JWT + permission-slug authorization (see [Endpoints](#endpoints)) — no placeholder auth remains.

## Entity

`domain/entities/role.entiry.ts` (filename typo `entiry.ts` is pre-existing/intentional, not fixed) — `RoleEntity`:

| Field         | Type       |
| ------------- | ---------- |
| `documentId`  | `string`   |
| `name`        | `string`   |
| `slug`        | `string`   |
| `permissions` | `string[]` |
| `level`       | `number`   |
| `isDefault`   | `boolean`  |
| `createdAt`   | `Date`     |
| `updatedAt`   | `Date`     |
| `updatedBy`   | `string \| null` |

Maps 1:1 to the `Role` Prisma model. `Role.permissions` is stored as raw `Json` in the DB but typed `string[]` in the domain layer; `PrismaRoleRepository` casts on read (`role.permissions as string[]`) and passes the array straight through as `InputJsonValue` on write (Prisma accepts arrays for `Json` columns natively — no explicit serialization step needed). `updatedBy` became nullable (schema migration) so the boot-time seeder can insert the four default roles with `updatedBy: null` before any real `User` exists.

## Repositories

`domain/repositories/role.repository.ts` — interface `IRoleRepository`, DI token `ROLE_REPOSITORY` (no typo):

- `findAll(): Promise<RoleEntity[]>`
- `findBySlug(slug): Promise<RoleEntity>`
- `findById(documentId): Promise<RoleEntity>`
- `create(data: CreateRoleData): Promise<RoleEntity>`
- `update(documentId, data: UpdateRoleData): Promise<RoleEntity>`
- `delete(documentId): Promise<void>`
- `hasAny(): Promise<boolean>`

`findBySlug`/`findById` signatures aren't nullable, but services treat a falsy result as "not found" at runtime. `findById` is also called by `users`' `UpdateUserService`/`DeleteUserService` (cross-module, via `RoleModule` import) to resolve a target user's role `level` for the level-hierarchy check — see [users.md](./users.md).

Domain errors: `RoleAlreadyExistsError`, `RoleNotFoundError` (both `extends Error`, with a `name` override and a formatted `message`).

`domain/repositories/user-role-count.repository.ts` — `IUserRoleCountRepository { countByRoleId(roleId): Promise<number> }`, DI token `USER_ROLE_COUNT_REPOSITORY`. Used only by delete, to block deleting a role still assigned to users.

Implementations: `infrastructure/persistence/prisma-role.repository.ts` (`PrismaRoleRepository`) and `infrastructure/persistence/prisma-user-role-count.repository.ts` (`PrismaUserRoleCountRepository`).

- `PrismaRoleRepository` translates Prisma errors to domain errors: a `P2002` (unique constraint) on `create` → `RoleAlreadyExistsError`; a `P2025` (record not found) on `update`/`delete` → `RoleNotFoundError`. `findBySlug`/`findById` return `null` cast to `RoleEntity` when no record is found, matching the interface's (pre-existing, non-nullable) return type — callers check the result as falsy, same as the mocked-repository unit tests do.
- `PrismaUserRoleCountRepository.countByRoleId(roleId)` → `prisma.user.count({ where: { roleId } })`.

## DTOs

`create-role.dto.ts`:

- `name` — `@IsString() @IsNotEmpty()`
- `slug` — `@IsString()`, `@Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)`, `@MaxLength(63)` (e.g. `content-manager`)
- `permissions` — `@IsArray()`, `@IsString({ each: true })`, `@ArrayUnique()`
- `level` — `@IsInt()`, `@Min(0)`, `@Max(100)`

`update-role.dto.ts` — `name?`, `permissions?`, `level?` (all `@IsOptional()` mirrors of create). No `slug` field — slugs are immutable after creation.

## Services & business rules

`CreateRoleService` / `UpdateRoleService` inject both `ROLE_REPOSITORY` and permissions' `PERMISSSION_REPOSITORY` (cross-module dependency, used only to validate permission slugs). **As of the permission-slug authorization rollout, none of the three mutating services take a caller parameter or perform any caller-authorization check** — that responsibility moved entirely to the controller's `PermissionsGuard` (see [Endpoints](#endpoints)). The `level` field stays on the entity/schema (still validated `0–100` via the DTOs) but is no longer read for authorization anywhere in this module.

**Create** (`execute(dto)`):

1. If `dto.permissions` is non-empty, every slug must exist in the permissions catalog → `400 BadRequest` listing unknown slugs. Empty array skips the check.
2. Creates with `isDefault: false` and `updatedBy: ""` hardcoded.
3. `RoleAlreadyExistsError` from the repo → `409 Conflict`; other errors rethrow.

**Update** (`execute(documentId, dto)`):

1. Fetch target via `findById` → `404` if missing.
2. If `existing.isDefault` and either `dto.name` or `dto.level` is provided → `400 BadRequest` ("Default roles only allow permissions changes").
3. If `dto.permissions` provided, same unknown-slug validation as create (duplicated logic, not shared).
4. `RoleNotFoundError` from the repo → `404`; other errors rethrow.

**Delete** (`execute(documentId)`):

1. Fetch target → `404` if missing.
2. `existing.isDefault` → `400 BadRequest` ("Default roles cannot be deleted").
3. `userRoleCounts.countByRoleId(documentId) > 0` → `409 Conflict` ("Role is still assigned to N user(s)").
4. `RoleNotFoundError` from the repo → `404`; other errors rethrow.

**List** — passthrough `findAll()`.

## Endpoints

`presentation/role.controller.ts`, class name **`RolesColtroller`** (typo, preserved), `@Controller("/api/v1/roles")`. All four routes are wired and guarded:

| Method   | Path                   | Service                                                       | Guard                                                       |
| -------- | ---------------------- | -------------------------------------------------------------- | ------------------------------------------------------------ |
| `GET`    | `/api/v1/roles`           | `ListRolesService`                                              | `JwtAuthGuard`, `PermissionsGuard` + `@RequirePermissions("role:read")` |
| `POST`   | `/api/v1/roles`           | `CreateRoleService`                                              | `JwtAuthGuard`, `PermissionsGuard` + `@RequirePermissions("role:manager")` |
| `PUT`    | `/api/v1/roles/:id`       | `UpdateRoleService`                                              | `JwtAuthGuard`, `PermissionsGuard` + `@RequirePermissions("role:manager")` |
| `DELETE` | `/api/v1/roles/:id` (204) | `DeleteRoleService` (`dalateRoleService`, typo'd field name)     | `JwtAuthGuard`, `PermissionsGuard` + `@RequirePermissions("role:manager")` |

`JwtAuthGuard` (`src/common/guards/jwt-auth.guard.ts`) validates the `Authorization: Bearer` access token (or a long-lived API token) and populates `req.user` (the shared `AuthenticatedRequest`/`AccessTokenPayload` type from `src/common/types/`). `PermissionsGuard` then checks `req.user.permissions` against the route's `@RequirePermissions` metadata (read-implies-manager). No controller method reads `req.user` directly anymore — the previous inline `AuthenticatedRequest` placeholder type and the `callerRoleSlug` extraction helper were removed entirely, since the services no longer need a caller identity at all.

## Module wiring

`role.module.ts` imports `PermissionModule` (to satisfy `CreateRoleService`/`UpdateRoleService`'s cross-module `PERMISSSION_REPOSITORY` dependency), registers the controller and all four services, and binds `ROLE_REPOSITORY → PrismaRoleRepository` and `USER_ROLE_COUNT_REPOSITORY → PrismaUserRoleCountRepository`. Exports `ROLE_REPOSITORY`/`USER_ROLE_COUNT_REPOSITORY`, consumed by `AuthModule` (role resolution during login/verify-otp) and `UserModule` (level-hierarchy check). Imported into `src/app.module.ts` alongside `PermissionModule`/`UserModule`/`AuthModule`.

## Known quirks (preserved intentionally, not cleaned up)

- `role.entiry.ts` filename typo, `RolesColtroller` class typo, `dalateRoleService` field typo.
- `updatedBy` hardcoded to `""` on create/update (same gap as `permissions`) — real caller identity isn't threaded through since `role:manager` is a coarse-grained permission, not a per-user audit trail.

## Tests

Service unit tests mock `IRoleRepository` / `IPermissionRepository` / `IUserRoleCountRepository` directly (`Test.createTestingModule` with `useValue` mocks) — no DB. Files: `create-role.service.spec.ts`, `update-role.service.spec.ts`, `delete-role.service.spec.ts`, `list-roles.service.spec.ts` (no longer cover caller-resolution/level-check branches — those were removed along with the code). `role.controller.spec.ts` tests plain delegation to the four services; it also provides a mocked `JwtTokenService` so the testing module can instantiate `JwtAuthGuard` (referenced via `@UseGuards`), even though guards aren't exercised by direct method calls in these unit tests.

Repository unit tests mock `PrismaService` as a plain object, one test per method plus the `RoleAlreadyExistsError`/`RoleNotFoundError` translation branches: `prisma-role.repository.spec.ts`, `prisma-user-role-count.repository.spec.ts`.

## Verified state (2026-07-23)

`bun run build`, `bunx tsc --noEmit`, `bunx eslint`, and `bun run test:cov` all pass with zero errors for this module. Branch-coverage gate: `prisma-role.repository.ts` is individually gated at ≥80% branches in `package.json`'s `coverageThreshold` (currently 95%); `prisma-user-role-count.repository.ts` and `presentation/**` are left ungated, consistent with how controllers/thin-wrapper repos are excluded from the gate elsewhere in this project.
