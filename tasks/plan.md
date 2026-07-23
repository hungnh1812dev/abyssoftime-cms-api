# User Module Fix + Roles/Permissions/Users Unit Test Coverage

## Context

The `users` module is structurally broken relative to `prisma/postgresql/schema.prisma` and inconsistent with the sibling `permissions` module (the established "gold standard" clean-architecture pattern: `domain → application → infrastructure → presentation`): `UserEntity` doesn't match the schema, `PrismaUserRepository.toEntity()` passes only 5 positional args into an entity constructor, `findByEmail`/`findByUsername` are declared on `IUserRepository` but never implemented, and `UserModule` is never imported into `AppModule`. Separately, `users`, `roles`, and `permissions` have zero test files, and the goal is ≥80% branch coverage on all three via pure unit tests (mocked repository interfaces, no DB).

Two schema questions came up during exploration and were resolved with the user:
1. **`User.updatedAt`** — schema currently has no `updatedAt` column on `User` (unlike `Role`/`Permission`, which both have it). Decision: **add `updatedAt DateTime @updatedAt @map("updated_at")` to the schema**, matching the Role/Permission pattern and satisfying SPEC.md's literal field list.
2. **`User.updatedBy`** — the currently-broken `UserEntity` has an 11th field, `updatedBy: string`, with no backing column (would require a self-referential FK with a bootstrap problem for the first user). Decision: **drop `updatedBy` from `UserEntity` entirely** — final entity has 10 fields, no schema change needed for this one.

Also confirmed via schema read: `username` has **no** `@unique` constraint (only `email` does) — `findByUsername` will use `findFirst`, not `findUnique`.

Per SPEC.md Assumptions (already resolved, not re-litigated here): Jest/ts-jest stays as the test runner despite the repo's Bun-first CLAUDE.md rule; Role module infra (module file, Prisma repo) is explicitly out of scope — role services/controller are tested by mocking the domain interfaces directly, no DB, no `AppModule` wiring; no password hashing/auth logic is added.

## Task Breakdown

### Phase 0 — Schema change (foundation, blocks everything else)

**Task 0.1: Update `prisma/postgresql/schema.prisma`**
- Add `updatedAt DateTime @updatedAt @map("updated_at")` to the `User` model (right after `createdAt`, mirroring `Role`/`Permission`).
- No other schema changes (no `@unique` added to `username`, no `updatedBy` added to `User`).

**Task 0.2: Regenerate Prisma client**
- Run `bun run prisma:generate` (→ `bun run scripts/prisma.ts generate`, defaults to `DB_DRIVER=postgresql`, schema-only generation, no DB connection needed).
- Verify `src/prisma/application/client/schema.prisma`'s `User` model now shows `username`, `accountType`, `verified`, `updatedAt` (currently stale — still shows old `displayName`/`passwordHash` fields, confirmed by reading the generated client).

**Verification:** `grep -A 20 "model User" src/prisma/application/client/schema.prisma` shows the regenerated shape matching source schema.

---

### Phase 1 — Fix the `users` module (vertical slice: domain → infra → application → presentation → wiring)

**Task 1.1: `src/modules/users/domain/entities/user.entity.ts`**
Final 10-field entity (drop `updatedBy`):
```ts
export class UserEntity {
  constructor(
    public readonly documentId: string,
    public readonly email: string,
    public readonly name: string,
    public readonly username: string,
    public readonly password: string,
    public readonly accountType: boolean,
    public readonly verified: boolean,
    public readonly roleId: string,
    public readonly createdAt: Date,
    public readonly updatedAt: Date,
  ) {}
}
```
Note `accountType: boolean` (schema type is `Boolean`, not `string` as the current broken entity has it).

**Task 1.2: `src/modules/users/domain/repositories/user.repository.ts`**
Keep `USER_REPOSITORY` token and existing method set (`findAll`, `findById`, `findByEmail`, `findByUsername`, `create`, `update`, `delete`, `count`) — these are already correctly declared, just fix the data interfaces:
```ts
export interface CreateUserData {
  email: string;
  name: string;
  username: string;
  password: string;
  accountType: boolean;
  verified: boolean;
  roleId: string;
}

export interface UpdateUserData {
  email?: string;
  name?: string;
  username?: string;
  password?: string;
  accountType?: boolean;
  verified?: boolean;
  roleId?: string;
}
```

**Task 1.3: `src/modules/users/infrastructure/persistence/prisma-user.repository.ts`**
Rewrite `toEntity()` to map all 10 fields in the entity's exact constructor order, and implement all 8 interface methods:
- `findAll`, `findById` — unchanged shape, just fixed `toEntity`.
- `findByEmail(email)` → `this.prisma.user.findUnique({ where: { email } })` (email is `@unique`).
- `findByUsername(username)` → `this.prisma.user.findFirst({ where: { username } })` (no `@unique` on username → `findFirst`, not `findUnique`).
- `create(data)` → pass all `CreateUserData` fields through (`email, name, username, password, accountType, verified, roleId` — `roleId` settable directly as the FK scalar, same style as `PrismaPermissionRepository`).
- `update(documentId, data)` → spread whichever `UpdateUserData` fields are present.
- `delete(documentId)` → unchanged.
- `count()` → `this.prisma.user.count()` (new, was missing).

**Task 1.4: DTOs**
- `create-user.dto.ts`: `email` (`@IsEmail()`), `name` (`@IsString() @IsNotEmpty()`), `username` (`@IsString() @IsNotEmpty()`), `password` (`@IsString() @IsNotEmpty()` — plain string, no hashing per SPEC), `accountType` (`@IsBoolean()`), `verified` (`@IsOptional() @IsBoolean()` — service defaults to `false` if omitted), `roleId` (`@IsString() @IsNotEmpty()`).
- `update-user.dto.ts`: same fields, all `@IsOptional()`.

**Task 1.5: Services** (`src/modules/users/application/services/*.ts`)
- `create-user.service.ts`: check `findByEmail(dto.email)` → `ConflictException('Email "${dto.email}" is already in use')` if found; check `findByUsername(dto.username)` → `ConflictException('Username "${dto.username}" is already in use')` if found; else `create({ ...dto, verified: dto.verified ?? false })`.
- `update-user.service.ts`: `findById(documentId)` → `NotFoundException` if missing; if `dto.email` provided and differs from `existing.email`, check `findByEmail` for a different-user collision → `ConflictException`; same pattern for `dto.username`/`findByUsername`; else `update(documentId, dto)`.
- `delete-user.service.ts`: unchanged pattern (`findById` → `NotFoundException` if missing, else `delete`).
- `list-user.service.ts`: unchanged passthrough.

**Task 1.6: Controller** — `src/modules/users/presentation/user.controller.ts` likely needs no structural change (routes already match the Permission controller's shape); just confirm it still compiles against the updated DTOs/entity.

**Task 1.7: Wire `UserModule` into `AppModule`**
`src/app.module.ts`: add `import { UserModule } from "./modules/users/user.module";` and include `UserModule` in the `imports` array alongside `PermissionModule`.

**Verification (end of Phase 1):** `bun run build` compiles with zero TypeScript errors. This is the hard checkpoint — do not proceed to Phase 2 until this passes, since broken types will make every subsequent test file fail to compile too.

---

### Phase 2 — Unit tests for `users`

Tests live next to source as `*.spec.ts` (Jest `testRegex: .*\.spec\.ts$`, `rootDir: src`).

- `create-user.service.spec.ts` — happy path; email-conflict branch; username-conflict branch; verified-defaults-to-false-when-omitted branch.
- `update-user.service.spec.ts` — not-found branch; email-changed-and-taken branch; email-changed-and-free branch; email-unchanged (skip check) branch; same three for username; happy path.
- `delete-user.service.spec.ts` — not-found branch; happy path.
- `list-user.service.spec.ts` — passthrough.
- `user.controller.spec.ts` — one test per route, mocking the four services (not the repository).
- `prisma-user.repository.spec.ts` — mock `PrismaService` as a plain object (`{ user: { findMany: jest.fn(), findUnique: jest.fn(), findFirst: jest.fn(), create: jest.fn(), update: jest.fn(), delete: jest.fn(), count: jest.fn() } }` cast to `PrismaService`), one test per method, confirming `toEntity` maps all 10 fields correctly and `findByUsername` calls `findFirst` (not `findUnique`).

Follow the mocked-repository pattern already given in SPEC.md's example test block for the service specs.

---

### Phase 3 — Unit tests for `permissions`

No source changes needed here — module is already correctly wired ("gold standard"). Just add tests:
- `create-permission.service.spec.ts` — conflict branch (slug exists); happy path.
- `update-permission.service.spec.ts` — not-found branch (empty `findByIds` result); happy path.
- `delete-permission.service.spec.ts` — not-found branch; still-referenced branch (`roleCount > 0`); still-referenced branch (`accessTokenCount` truthy, `roleCount` 0 — hits the `||` second operand); happy path (both zero).
- `list-permission.service.spec.ts` — passthrough.
- `permission.controller.spec.ts` — one test per route.
- `prisma-permission.repository.spec.ts` — mock `PrismaService`, one test per method including `countReferences`.

**Checkpoint:** run `bun run test:cov` after Phase 3 and sanity-check the coverage report for `permissions` before moving on to the more branch-heavy `roles` module — confirms the mocking pattern and Jest config changes (Phase 5) are working before tackling the hardest module.

---

### Phase 4 — Unit tests for `roles`

No source changes (explicitly out of scope per SPEC — no `role.module.ts`, no `PrismaRoleRepository`). Tests construct services directly with mocked `IRoleRepository` / `IPermissionRepository` / `IUserRoleCountRepository` (via `Test.createTestingModule` + `provide: ROLE_REPOSITORY/PERMISSSION_REPOSITORY/USER_ROLE_COUNT_REPOSITORY, useValue: mock`, or plain `new Service(mockA, mockB)` — either works since there's no module file to instantiate).

- `create-role.service.spec.ts`: caller-role-unresolved (Forbidden); `dto.level >= callerRole.level` (Forbidden); empty `permissions` array (skips catalog check); non-empty with unknown slug(s) (BadRequest); non-empty all valid (passes); repo throws `RoleAlreadyExistsError` on create (Conflict); repo throws other error (rethrow); happy path.
- `update-role.service.spec.ts`: caller-role-unresolved (Forbidden); target-not-found (NotFound); `existing.level >= callerRole.level` (Forbidden); `dto.level` provided and `>= callerRole.level` (Forbidden); `existing.isDefault` + name/level provided (BadRequest); `dto.permissions` provided (runs assertion, plus its own empty/invalid/valid sub-branches) vs undefined (skipped); repo throws `RoleNotFoundError` on update (NotFound) vs other (rethrow); happy path.
- `delete-role.service.spec.ts`: caller-role-unresolved (Forbidden); target-not-found (NotFound); `existing.level >= callerRole.level` (Forbidden); `existing.isDefault` (BadRequest); `assignedUserCount > 0` (Conflict); repo throws `RoleNotFoundError` on delete (NotFound) vs other (rethrow); happy path.
- `list-roles.service.spec.ts`: passthrough.
- `role.controller.spec.ts`: only tests the existing `list()` method — `RolesColtroller` currently has no routes wired for create/update/delete (those services are injected but unused/dead code; SPEC's Assumptions confirm this is intentionally out of scope, not something this task adds routes for).

**Do not touch** `role.entiry.ts`, `RolesColtroller`, `PERMISSSION_REPOSITORY`, `dalateRoleService` typos — test against the symbols as they exist today.

---

### Phase 5 — Coverage gate + final verification

**Task 5.1:** Add a scoped `coverageThreshold` to the `jest` block in `package.json` for branches only, targeting the three module paths (relative to `rootDir: src`):
```json
"coverageThreshold": {
  "./modules/users/**/*.ts": { "branches": 80 },
  "./modules/roles/**/*.ts": { "branches": 80 },
  "./modules/permissions/**/*.ts": { "branches": 80 }
}
```
Adjust glob syntax if Jest's threshold matcher needs a different form once run (verify against actual `test:cov` output — Jest resolves threshold keys as path globs relative to rootDir).

**Task 5.2:** Run full verification suite:
- `bun run build` — zero TypeScript errors.
- `bun run test:cov` — all tests pass, branch coverage ≥80% for `src/modules/users`, `src/modules/roles`, `src/modules/permissions`.
- `bun run lint` — zero new errors.

**Final checkpoint:** All three commands green. If branch coverage falls short on any module, add targeted tests for the specific uncovered branches shown in the coverage report — never weaken a test or delete an assertion to hit the number (per SPEC boundary).

## Files Touched (summary)

- `prisma/postgresql/schema.prisma` (1 field added)
- `src/prisma/application/client/**` (regenerated, gitignored)
- `src/modules/users/**` (entity, repository interface, Prisma repo, DTOs, 4 services rewritten to match schema; controller likely untouched)
- `src/app.module.ts` (add `UserModule` import)
- `package.json` (`coverageThreshold` added to `jest` block)
- New `*.spec.ts` files across `src/modules/users`, `src/modules/roles`, `src/modules/permissions` (~18 files, one per service/controller/Prisma-repo)
- No changes to `src/modules/roles/**` source, no new `role.module.ts`, no `PrismaRoleRepository`
