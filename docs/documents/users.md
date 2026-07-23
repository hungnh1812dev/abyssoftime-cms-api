# Users Module

`src/modules/users/**` — clean-architecture module for managing user accounts. Fully wired: registered in `AppModule`, all CRUD routes live, Prisma-backed. Brought up to the same standard as `permissions` (previously broken — entity/repository/DTO field mismatches, missing `findByEmail`/`findByUsername`, unwired `AppModule` import; all fixed).

## Entity

`domain/entities/user.entity.ts` — `UserEntity`:

| Field         | Type      |
| ------------- | --------- |
| `documentId`  | `string`  |
| `email`       | `string`  |
| `name`        | `string`  |
| `username`    | `string`  |
| `password`    | `string`  |
| `accountType` | `boolean` |
| `verified`    | `boolean` |
| `roleId`      | `string`  |
| `createdAt`   | `Date`    |
| `updatedAt`   | `Date`    |

Maps to the `User` Prisma model minus relation fields (`role`, `updatedRoles`, `updatedPermissions` aren't on the entity). No `updatedBy` field — the schema doesn't track who last updated a user record. `password` is stored/returned as a plain string; **no hashing is applied in this module** (out of scope — auth/hashing is separate future work).

## Repository

`domain/repositories/user.repository.ts` — interface `IUserRepository`, DI token `USER_REPOSITORY` (no typo):

- `findAll(): Promise<UserEntity[]>`
- `findById(documentId): Promise<UserEntity | null>`
- `findByEmail(email): Promise<UserEntity | null>`
- `findByUsername(username): Promise<UserEntity | null>`
- `create(data: CreateUserData): Promise<UserEntity>`
- `update(documentId, data: UpdateUserData): Promise<UserEntity>`
- `delete(documentId): Promise<void>`
- `count(): Promise<number>`

Implementation: `infrastructure/persistence/prisma-user.repository.ts` (`PrismaUserRepository`). `findByEmail` uses `prisma.user.findUnique` (`email` is `@unique` in the schema); `findByUsername` uses `prisma.user.findFirst` — **`username` has no unique constraint** in `prisma/postgresql/schema.prisma`, so `findUnique` isn't available there.

## DTOs

`create-user.dto.ts`:

- `email` — `@IsEmail()`
- `name` — `@IsString() @IsNotEmpty()`
- `username` — `@IsString() @IsNotEmpty()`
- `password` — `@IsString() @IsNotEmpty()` (plaintext; no hashing decorator)
- `accountType` — `@IsBoolean()`
- `verified` — `@IsOptional() @IsBoolean()` (service defaults to `false` when omitted)
- `roleId` — `@IsString() @IsNotEmpty()` (not validated against the roles catalog — no existence check)

`update-user.dto.ts` — same fields, all `@IsOptional()`.

## Services & business rules

All four services inject `@Inject(USER_REPOSITORY)`.

- **Create** — `409 ConflictException` if `email` already in use; `409 ConflictException` if `username` already in use. `verified` defaults to `false` if omitted.
- **Update** — `404 NotFoundException` if `documentId` not found. If `dto.email` is provided and differs from the existing value, re-checks uniqueness (`409` if taken by another user); same pattern for `dto.username`. Unchanged email/username skip the uniqueness check.
- **Delete** — `404` if not found. No "still referenced" guard (unlike permissions/roles — deleting a user doesn't check for dependent records).
- **List** — passthrough `findAll()`.

## Endpoints

`presentation/user.controller.ts`, `@Controller("/api/users")`:

| Method   | Path                   | Service             |
| -------- | ---------------------- | ------------------- |
| `GET`    | `/api/users`           | `ListUserService`   |
| `POST`   | `/api/users`           | `CreateUserService` |
| `PUT`    | `/api/users/:id`       | `UpdateUserService` |
| `DELETE` | `/api/users/:id` (204) | `DeleteUserService` |

## Module wiring

`user.module.ts` registers the controller, all four services, and binds `USER_REPOSITORY → PrismaUserRepository`. Imported into `src/app.module.ts`.

## Known gaps (deferred, out of scope for the current pass)

- No password hashing — `password` is round-tripped as plain text. Do not treat this as production-ready auth.
- `roleId` on create/update is not validated for existence against the `roles` catalog.
- No `updatedBy`/audit trail on the `User` model, unlike `Role`/`Permission`.
- Delete has no dependent-record guard.

## Tests

Unit tests (Jest, mocked repository, ≥80% branch coverage) live next to each source file: `create-user.service.spec.ts`, `update-user.service.spec.ts`, `delete-user.service.spec.ts`, `list-user.service.spec.ts`, `user.controller.spec.ts`, `prisma-user.repository.spec.ts` (covers the `findByUsername` → `findFirst` no-unique-constraint behavior explicitly).

## Verified state (2026-07-23)

`bun run build`, `bunx tsc --noEmit`, `bunx eslint`, and `bun run test` all pass with zero errors for this module.
