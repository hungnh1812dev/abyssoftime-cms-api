# Spec: User Module Fix + Permission/Role/User Unit Tests

## Objective

Two deliverables against the existing NestJS CMS API (clean-architecture style: `domain` / `application` / `infrastructure` / `presentation` per module):

1. **Fix the User module.** It is currently structurally broken relative to the Prisma schema and inconsistent with the sibling `roles`/`permissions` modules: `UserEntity` has 11 fields but `PrismaUserRepository.toEntity()` builds it from only 5 in the wrong order; `IUserRepository.create`/`update` only accept `{ name, updatedBy }` (missing email, username, password, accountType, roleId); `findByEmail`/`findByUsername` are declared on the interface but never implemented; `UserModule` is never imported into `AppModule`. Bring User up to the same standard as Permission (fully wired, schema-consistent, compiles cleanly).
2. **Add unit test coverage for the `users`, `roles`, and `permissions` modules** — services (and controllers) — with ≥80% **branch** coverage on those three module directories, using mocked repository interfaces (no real Prisma/DB calls).

Success = `bun run test:cov` (Jest) passes, TypeScript compiles with no errors, and the coverage report shows ≥80% branch coverage for `src/modules/users`, `src/modules/roles`, `src/modules/permissions`.

## Assumptions (confirmed via clarifying questions)

- **Test runner:** Keep Jest/ts-jest as already configured in `package.json` (not migrating to `bun test`), since NestJS `TestingModule` + mocked-provider patterns are already set up there. This is a documented exception to the repo's general Bun-first CLAUDE.md rule, scoped only to test execution.
- **Coverage scope:** The ≥80% branch threshold applies only to `src/modules/users/**`, `src/modules/roles/**`, `src/modules/permissions/**`. Untouched files (`main.ts`, `app.module.ts`, `config/`, `prisma/`) are excluded from the threshold gate.
- **User module fix depth:** Structural fix only — align entity/repository/DTO/module wiring with the schema and with the Role/Permission pattern. **No password hashing** (bcrypt) and no auth/login logic — that's separate, future work.
- **Role module infra:** Out of scope. `RoleModule` has no `role.module.ts` and no `PrismaRoleRepository`/user-role-count implementation, and this task does **not** add them. Role services are tested by mocking `IRoleRepository`, `IPermissionRepository`, and `IUserRoleCountRepository` directly — no DB, no module wiring, no AppModule registration for Roles.
- Existing naming quirks (`role.entiry.ts`, `RolesColtroller`, `PERMISSSION_REPOSITORY`, `dalateRoleService`) are left as-is — out of scope, not touched by this task.
- `password` on `User` is stored/returned as a plain string field for now (matches current `password_hash` column name in schema, but no hashing is added in this pass, per the confirmed scope above).

## Tech Stack

- NestJS 11, TypeScript (strict null checks), Prisma 7 (Postgres/MySQL/SQLite driver adapters)
- `class-validator` / `class-transformer` for DTOs
- Jest 30 + ts-jest + `@nestjs/testing` for unit tests
- Bun as the runtime/package manager for everything else (per project CLAUDE.md)

## Commands

```
Install:      bun install
Dev:          bun run start:dev
Build:        bun run build
Lint:         bun run lint
Test:         bun run test
Test (watch): bun run test:watch
Coverage:     bun run test:cov
```

## Project Structure

Existing per-module clean-architecture layout (already established by `permissions`; `users` and `roles` follow it):

```
src/modules/<module>/
  domain/
    entities/<name>.entity.ts          → plain data class, no framework deps
    repositories/<name>.repository.ts  → interface + DI token (Symbol) + domain errors
  application/
    dto/<action>-<name>.dto.ts         → class-validator DTOs
    services/<action>-<name>.service.ts→ one use-case per service, @Injectable
  infrastructure/
    persistence/prisma-<name>.repository.ts → Prisma implementation of the domain interface
  presentation/
    <name>.controller.ts               → thin HTTP layer, delegates to services
  <name>.module.ts                     → wires controller + services + repository binding
```

Tests live **next to the file under test** as `*.spec.ts` (Jest's configured `testRegex` is `.*\.spec\.ts$`, `rootDir: src`), e.g.:

```
src/modules/users/application/services/create-user.service.spec.ts
src/modules/users/infrastructure/persistence/prisma-user.repository.spec.ts
src/modules/users/presentation/user.controller.spec.ts
```

## Code Style

- Match existing formatting exactly: Prettier config already in `.prettierrc` (180 print width, double-quote-off i.e. `"singleQuote": false`, trailing commas, import order: third-party → `@nestjs/*` → `@/*` → relative).
- Services throw Nest `HttpException` subclasses (`NotFoundException`, `ConflictException`, `ForbiddenException`, `BadRequestException`) directly — this is the established error-handling convention in `roles`/`permissions`; domain-level errors (e.g. `RoleNotFoundError`) are caught and translated to HTTP exceptions inside the service, not the controller.
- DI via constructor injection with `@Inject(SOME_REPOSITORY_TOKEN)` against the domain interface type — never inject the Prisma repository class directly.

Example unit test shape to follow (mock the repository interface, not Prisma):

```ts
import { Test } from "@nestjs/testing";
import { NotFoundException } from "@nestjs/common";

import { CreateUserService } from "./create-user.service";
import { IUserRepository, USER_REPOSITORY } from "../../domain/repositories/user.repository";

describe("CreateUserService", () => {
  let service: CreateUserService;
  let repo: jest.Mocked<IUserRepository>;

  beforeEach(async () => {
    repo = {
      findAll: jest.fn(),
      findById: jest.fn(),
      findByEmail: jest.fn(),
      findByUsername: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    };

    const module = await Test.createTestingModule({
      providers: [CreateUserService, { provide: USER_REPOSITORY, useValue: repo }],
    }).compile();

    service = module.get(CreateUserService);
  });

  it("creates a user via the repository", async () => {
    repo.create.mockResolvedValue(/* ... */);
    // assert result + repo.create called with expected data
  });
});
```

## Testing Strategy

- **Framework:** Jest via `bun run test` / `bun run test:cov` (existing `package.json` jest block, unchanged).
- **Level:** Pure unit tests only — services and controllers, all collaborators (repository interfaces) mocked with `jest.Mocked<T>` or manual mock objects. No Prisma, no real database, no e2e tests in this pass.
- **What gets tests:**
  - `users`: `CreateUserService`, `UpdateUserService`, `DeleteUserService`, `ListUserService`, `UserController`, and `PrismaUserRepository` (mocking `PrismaService` calls) once it's fixed.
  - `roles`: `CreateRoleService`, `UpdateRoleService`, `DeleteRoleService`, `ListRolesService`, and the role controller — covering every branch (permission-level checks, default-role guards, unknown-permission-slug rejection, not-found/forbidden/conflict paths).
  - `permissions`: `CreatePermissionService`, `UpdatePermissionService`, `DeletePermissionService`, `ListPermissionService`, `PermissionController`, `PrismaPermissionRepository`.
- **Coverage gate:** Add a scoped Jest `coverageThreshold` for the three module paths at ≥80% `branches` (statements/functions/lines may end up higher incidentally — branches is the binding constraint). Verified via `bun run test:cov`.
- Every `if`/`throw`/guard clause in the existing role/permission services (there are many: level checks, default-role checks, empty-permissions short-circuit, not-found variants) needs at least one test hitting each side, since that's what drives branch coverage past 80%.

## Boundaries

- **Always:** Run `bun run test:cov` and `bun run lint` before considering a task done; keep DTOs/entities in sync with `prisma/postgresql/schema.prisma`; mock repository interfaces in unit tests, never hit a real database.
- **Ask first:** Adding any new dependency (e.g. a hashing library, if password hashing is revisited later); changing `prisma/postgresql/schema.prisma`; changing the Jest config's global (non-module-scoped) coverage behavior; building out `RoleModule`'s missing Prisma infrastructure (explicitly deferred by this spec).
- **Never:** Commit `.env*` files or secrets; add authentication/session logic as a side effect of this task; rename existing symbols/files with typos (`role.entiry.ts`, `RolesColtroller`, etc.) as an unrequested cleanup; weaken or delete a failing test to hit the coverage number.

## Success Criteria

- [ ] `UserEntity`, `IUserRepository`, `PrismaUserRepository`, `CreateUserDto`/`UpdateUserDto`, and the User services are consistent with the Prisma `User` model (email, name, username, password, accountType, verified, roleId, createdAt, updatedAt) and with each other (no arg-order/arity mismatches).
- [ ] `findByEmail` and `findByUsername` are implemented on `PrismaUserRepository`.
- [ ] `UserModule` is imported in `src/app.module.ts` alongside `PermissionModule`.
- [ ] `bun run build` / TypeScript compiles with no errors.
- [ ] New `*.spec.ts` files exist for the services (and controllers) of `users`, `roles`, `permissions`.
- [ ] `bun run test:cov` passes, and branch coverage for `src/modules/users`, `src/modules/roles`, `src/modules/permissions` is ≥80%.
- [ ] `bun run lint` passes with no new errors.

## Open Questions

None outstanding — all four scoping decisions were confirmed above. Flag here if anything new comes up during implementation (e.g. an untestable branch, or a schema field that doesn't map cleanly to the current DTO shape).
