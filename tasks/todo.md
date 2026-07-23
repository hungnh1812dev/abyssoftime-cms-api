# Todo — User Module Fix + Roles/Permissions/Users Unit Tests

See `tasks/plan.md` for full context and rationale.

## Phase 0 — Schema (blocks everything)
- [x] Add `updatedAt DateTime @updatedAt @map("updated_at")` to `User` model in `prisma/postgresql/schema.prisma`
- [x] Run `bun run prisma:generate`
- [x] Verify: `grep -A 20 "model User" src/prisma/application/client/schema.prisma` shows `username`, `accountType`, `verified`, `updatedAt`

## Phase 1 — Fix `users` module
- [x] `user.entity.ts` — 10-field entity (drop `updatedBy`, `accountType: boolean`)
- [x] `user.repository.ts` — fix `CreateUserData`/`UpdateUserData` interfaces
- [x] `prisma-user.repository.ts` — fix `toEntity()` (10 fields, correct order), implement `findByEmail` (`findUnique`), `findByUsername` (`findFirst`), `count`
- [x] `create-user.dto.ts` / `update-user.dto.ts` — full field set with correct validators
- [x] `create-user.service.ts` — email conflict + username conflict checks, `verified` defaults to `false`
- [x] `update-user.service.ts` — not-found check, email/username re-uniqueness checks only when changed
- [x] `delete-user.service.ts` — confirm unchanged (not-found + delete)
- [x] `list-user.service.ts` — confirm unchanged (passthrough)
- [x] `user.controller.ts` — confirm compiles against new DTOs/entity (likely no change)
- [x] `app.module.ts` — import `UserModule` alongside `PermissionModule`
- [x] **Checkpoint:** `bun run build` — zero TypeScript errors

## Phase 2 — Tests: `users`
- [x] `create-user.service.spec.ts` (happy path, email conflict, username conflict, verified-default)
- [x] `update-user.service.spec.ts` (not-found, email taken/free/unchanged, username taken/free/unchanged, happy path)
- [ ] `delete-user.service.spec.ts` (not-found, happy path)
- [ ] `list-user.service.spec.ts` (passthrough)
- [ ] `user.controller.spec.ts` (one test per route)
- [ ] `prisma-user.repository.spec.ts` (one test per method, mocked `PrismaService`)

## Phase 3 — Tests: `permissions`
- [ ] `create-permission.service.spec.ts` (conflict, happy path)
- [ ] `update-permission.service.spec.ts` (not-found, happy path)
- [ ] `delete-permission.service.spec.ts` (not-found, roleCount>0, accessTokenCount truthy, happy path)
- [ ] `list-permission.service.spec.ts` (passthrough)
- [ ] `permission.controller.spec.ts` (one test per route)
- [ ] `prisma-permission.repository.spec.ts` (one test per method incl. `countReferences`)
- [ ] **Checkpoint:** `bun run test:cov` — sanity-check `permissions` coverage before starting `roles`

## Phase 4 — Tests: `roles` (no source changes)
- [ ] `create-role.service.spec.ts` (forbidden×2, empty-permissions skip, unknown-slug, valid, RoleAlreadyExistsError→Conflict, other-error rethrow, happy path)
- [ ] `update-role.service.spec.ts` (forbidden×3 variants, not-found, default-role guard, permissions-provided vs undefined, RoleNotFoundError→NotFound, other-error rethrow, happy path)
- [ ] `delete-role.service.spec.ts` (forbidden×2, not-found, default-role guard, assigned-count conflict, RoleNotFoundError→NotFound, other-error rethrow, happy path)
- [ ] `list-roles.service.spec.ts` (passthrough)
- [ ] `role.controller.spec.ts` (only `list()` — no create/update/delete routes exist)

## Phase 5 — Coverage gate + final verification
- [ ] Add scoped `coverageThreshold` (branches ≥80%) to `jest` block in `package.json` for `users`/`roles`/`permissions`
- [ ] `bun run build` — zero errors
- [ ] `bun run test:cov` — all green, branch coverage ≥80% for all three modules
- [ ] `bun run lint` — zero new errors
