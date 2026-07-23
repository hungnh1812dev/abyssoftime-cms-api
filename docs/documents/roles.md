# Roles Module

`src/modules/roles/**` — clean-architecture module for managing role records (name/slug/level/permission-set). **Fully wired into the running app**: `role.module.ts` registers Prisma-backed implementations for both `IRoleRepository` and `IUserRoleCountRepository`, and `RoleModule` is imported into `AppModule`. All four CRUD routes are HTTP-reachable and backed by the real database — see [Endpoints](#endpoints) for how `callerRoleSlug` is currently sourced (a placeholder pending real auth).

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
| `updatedBy`   | `string`   |

Maps 1:1 to the `Role` Prisma model. `Role.permissions` is stored as raw `Json` in the DB but typed `string[]` in the domain layer; `PrismaRoleRepository` casts on read (`role.permissions as string[]`) and passes the array straight through as `InputJsonValue` on write (Prisma accepts arrays for `Json` columns natively — no explicit serialization step needed).

## Repositories

`domain/repositories/role.repository.ts` — interface `IRoleRepository`, DI token `ROLE_REPOSITORY` (no typo):

- `findAll(): Promise<RoleEntity[]>`
- `findBySlug(slug): Promise<RoleEntity>`
- `findById(documentId): Promise<RoleEntity>`
- `create(data: CreateRoleData): Promise<RoleEntity>`
- `update(documentId, data: UpdateRoleData): Promise<RoleEntity>`
- `delete(documentId): Promise<void>`
- `hasAny(): Promise<boolean>`

`findBySlug`/`findById` signatures aren't nullable, but services treat a falsy result as "not found" at runtime.

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

`CreateRoleService` / `UpdateRoleService` inject both `ROLE_REPOSITORY` and permissions' `PERMISSSION_REPOSITORY` (cross-module dependency, used only to validate permission slugs). None of the mutating services resolve the caller's identity themselves — `callerRoleSlug` is a required parameter the caller must supply, sourced by the controller from `req.user?.roleSlug` (see [Endpoints](#endpoints)).

**Create** (`execute(dto, callerRoleSlug)`):

1. Resolve caller role via `findBySlug`; missing → `403 Forbidden`.
2. `dto.level >= callerRole.level` → `403 Forbidden` (can only create roles strictly below your own level).
3. If `dto.permissions` is non-empty, every slug must exist in the permissions catalog → `400 BadRequest` listing unknown slugs. Empty array skips the check.
4. Creates with `isDefault: false` and `updatedBy: ""` hardcoded.
5. `RoleAlreadyExistsError` from the repo → `409 Conflict`; other errors rethrow.

**Update** (`execute(documentId, dto, callerRoleSlug)`):

1. Resolve caller role → `403` if unresolved.
2. Fetch target via `findById` → `404` if missing.
3. `existing.level >= callerRole.level` → `403` (can't edit a role at/above your level).
4. If `dto.level` provided and `>= callerRole.level` → `403`.
5. If `existing.isDefault` and either `dto.name` or `dto.level` is provided → `400 BadRequest` ("Default roles only allow permissions changes").
6. If `dto.permissions` provided, same unknown-slug validation as create (duplicated logic, not shared).
7. `RoleNotFoundError` from the repo → `404`; other errors rethrow.

**Delete** (`execute(documentId, callerRoleSlug)`):

1. Resolve caller role → `403` if unresolved.
2. Fetch target → `404` if missing.
3. `existing.level >= callerRole.level` → `403`.
4. `existing.isDefault` → `400 BadRequest` ("Default roles cannot be deleted").
5. `userRoleCounts.countByRoleId(documentId) > 0` → `409 Conflict` ("Role is still assigned to N user(s)").
6. `RoleNotFoundError` from the repo → `404`; other errors rethrow.

**List** — passthrough `findAll()`.

## Endpoints

`presentation/role.controller.ts`, class name **`RolesColtroller`** (typo, preserved), `@Controller("/api/roles")`. All four routes are wired:

| Method   | Path                   | Service                                                      |
| -------- | ---------------------- | ------------------------------------------------------------ |
| `GET`    | `/api/roles`           | `ListRolesService`                                           |
| `POST`   | `/api/roles`           | `CreateRoleService`                                          |
| `PUT`    | `/api/roles/:id`       | `UpdateRoleService`                                          |
| `DELETE` | `/api/roles/:id` (204) | `DeleteRoleService` (`dalateRoleService`, typo'd field name) |

`POST`/`PUT`/`DELETE` each take `@Req() req: AuthenticatedRequest` and derive `callerRoleSlug = req.user?.roleSlug ?? ""`. **`AuthenticatedRequest`** (`export type AuthenticatedRequest = Request & { user?: { roleSlug: string } }`, defined in `role.controller.ts`) is a placeholder shape for the `req.user` an auth guard/middleware will populate once real authentication is implemented — there is no such guard yet anywhere in this app. Until then, every request has `req.user === undefined`, so `callerRoleSlug` resolves to `""`, `findBySlug("")` returns falsy, and every mutating call is rejected with `403 Forbidden ("Caller's role could not be resolved")`. This is a safe default (fails closed, not open) but means the routes are not usable end-to-end until an auth guard populates `req.user.roleSlug`.

## Module wiring

`role.module.ts` imports `PermissionModule` (to satisfy `CreateRoleService`/`UpdateRoleService`'s cross-module `PERMISSSION_REPOSITORY` dependency), registers the controller and all four services, and binds `ROLE_REPOSITORY → PrismaRoleRepository` and `USER_ROLE_COUNT_REPOSITORY → PrismaUserRoleCountRepository`. Imported into `src/app.module.ts` alongside `PermissionModule`/`UserModule`.

## Known quirks (preserved intentionally, not cleaned up)

- `role.entiry.ts` filename typo, `RolesColtroller` class typo, `dalateRoleService` field typo.
- `POST`/`PUT`/`DELETE /api/roles` are wired but **not usable until real auth exists** — `callerRoleSlug` always resolves to `""` today, so every mutating call gets `403 Forbidden`. See [Endpoints](#endpoints).
- `updatedBy` hardcoded to `""` on create (same gap as permissions) — will also need real caller identity once auth lands.

## Tests

Service unit tests mock `IRoleRepository` / `IPermissionRepository` / `IUserRoleCountRepository` directly (`Test.createTestingModule` with `useValue` mocks) — no DB. Files: `create-role.service.spec.ts`, `update-role.service.spec.ts`, `delete-role.service.spec.ts`, `list-roles.service.spec.ts`, `role.controller.spec.ts` (all four routes, including the `req.user` undefined → empty-string-callerRoleSlug branch).

Repository unit tests mock `PrismaService` as a plain object, one test per method plus the `RoleAlreadyExistsError`/`RoleNotFoundError` translation branches: `prisma-role.repository.spec.ts`, `prisma-user-role-count.repository.spec.ts`.

## Verified state (2026-07-23)

`bun run build`, `bunx tsc --noEmit`, `bunx eslint`, and `bun run test:cov` all pass with zero errors for this module, including the `infrastructure/` layer and the now fully-wired `presentation/` controller. Branch-coverage gate: `prisma-role.repository.ts` is individually gated at ≥80% branches in `package.json`'s `coverageThreshold` (currently 95%); `prisma-user-role-count.repository.ts` is left ungated, consistent with how `presentation/**` controllers are excluded from the gate elsewhere in this project — its only method has no conditional logic, so its sole "branch" is an Istanbul artifact from the constructor's parameter property, not real behavior to test.
