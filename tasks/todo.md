# Todo — Users module lockdown + role-assignment endpoint

See `tasks/plan.md` for full context, approach, and confirmed decisions.

## Phase 1 — Create endpoint lockdown

- [x] `create-user.dto.ts` — remove `accountType`/`verified`/`roleId` fields + decorators/imports;
      keep `email`/`name`/`username`/`password`
- [x] `create-user.service.ts` — replace `accountType: dto.accountType, verified: dto.verified ??
      false, roleId: dto.roleId` with fixed literals `accountType: false, verified: false, roleId:
      null`
- [x] `create-user.service.spec.ts` — rewrite field-passthrough assertions to assert fixed literals;
      fix any fixture still constructing the removed DTO fields
- [x] `user.controller.spec.ts` — fix any `POST` fixture/body referencing the removed fields
- [x] **Checkpoint 1:** `bun run build && bun run test src/modules/users && bun run lint` green;
      confirm staged files + commit message with user before committing

## Phase 2 — Update endpoint lockdown (self-or-manager, immutable identifiers)

- [ ] `update-user.dto.ts` — shrink to `name?`/`password?` only
- [ ] `update-user.service.ts` — delete email/username uniqueness block, level-hierarchy block,
      new-role-check block; drop unused `ROLE_REPOSITORY` injection/`IRoleRepository`
      import/`SUPER_ADMIN_ROLE_SLUG`; add self-or-`user:manager` check after the 404 lookup;
      `users.update(...)` now only passes `name`/`password`
- [ ] `user.controller.ts` — on `PUT :id`, remove `@RequirePermissions("user:manager")` and drop
      `PermissionsGuard` from `@UseGuards` (keep `JwtAuthGuard` only); update 403 `@ApiResponse`
      description; add `Patch` to the `@nestjs/common` import
- [ ] `update-user.service.spec.ts` — remove role-repository mocking and all hierarchy/new-role-check
      cases (behavior no longer exists); add self-update-allowed, other-user-with-`user:manager`,
      other-user-without-permission-403, and `users.update` called with only `name`/`password` cases
- [ ] `user.controller.spec.ts` — remove/rewrite any `@RequirePermissions` metadata assertion on
      `PUT :id`; add a self-update-without-`user:manager` case
- [ ] **Checkpoint 2:** `bun run build && bun run test src/modules/users && bun run lint` green
      (expect deliberate test-count changes vs. baseline — old hierarchy cases removed); confirm
      before committing

## Phase 3 — Role-assignment endpoint

- [ ] New `update-user-role.dto.ts` — `{ roleId: string }` (`@ApiProperty`, `@IsString`,
      `@IsNotEmpty`)
- [ ] New `update-user-role.service.ts` — inject `USER_REPOSITORY` + `ROLE_REPOSITORY`; 404 user not
      found → 404 `dto.roleId` not resolved → level-hierarchy check vs. target's current role (if
      any) → new-role check (super_admin-promotion carve-out, else `caller.level` > new role's level)
      → `users.update(documentId, { roleId })` → return updated entity
- [ ] `user.controller.ts` — add `PATCH /:id/role`, `@UseGuards(JwtAuthGuard, PermissionsGuard)`,
      `@RequirePermissions("user:role_manager")`, `@Req() req: AuthenticatedRequest`, returns
      `UserResponseDto.fromEntity(...)`; `@ApiOperation`/`@ApiResponse` (200/403/404)
- [ ] `user.module.ts` — add `UpdateUserRoleService` to `providers`
- [ ] `seed-default-data.service.ts` — add `{ slug: "user:role_manager", name: "Manage user roles",
      description: "Assign roles to users" }` to `DEFAULT_PERMISSIONS`; add `"user:role_manager"` to
      `super_admin`'s permissions only (not `admin`)
- [ ] New `update-user-role.service.spec.ts` — relocate hierarchy/new-role-check cases from Phase 2's
      removed tests, renamed to the new SUT, plus the new roleId-not-found 404 case; add
      `coverageThreshold` entry per project convention
- [ ] `user.controller.spec.ts` — add `PATCH /:id/role` cases (success, 403, 404)
- [ ] `seed-default-data.service.spec.ts` — bump `toHaveBeenCalledTimes(17)`→`18` and `(16)`→`17`; add
      slug to `createdSlugs` and `superAdminCall.permissions`; confirm `adminCall.permissions`
      unchanged
- [ ] **Checkpoint 3:** `bun run build && bun run test && bun run lint` green (run
      `seed-default-data.service.spec.ts` in isolation first — hardcoded counts are the easiest silent
      miscount); confirm before committing

## Phase 4 — Manual verification, docs, spec cleanup

- [ ] `bun run start:dev` + manual smoke test: create user (POST, confirm fixed
      accountType/verified/roleId in response), self-update (PUT, no `user:manager`), admin-update
      another user (PUT, with `user:manager`), update-without-permission-403, role-assign as
      `super_admin` (PATCH, 200), role-assign-without-permission-403; confirm `/api-docs-json` shows
      the new route
- [ ] `docs/documents/users.md` — rewrite Entity/DTOs/Services/Endpoints sections; remove the
      now-closed "no roleId existence check" Known Gap; document new endpoint, self-or-manager rule,
      `user:role_manager`
- [ ] `docs/documents/permissions.md` — add `user:role_manager`, matching existing structure
- [ ] `docs/documents/roles.md` — update `super_admin`'s documented permission list if enumerated
      literally
- [ ] `docs/documents/swagger.md` — bump "35 paths, 47 operations" → "36 paths, 48 operations" once
      confirmed live
- [ ] `SPEC.md` — trim to one-line pointer at `docs/documents/users.md`, per "Root docs" rule
- [ ] **Checkpoint 4 (final):** five-axis code review (`agent-skills:code-reviewer`), apply any
      Critical/Important findings, re-verify, confirm final commit(s) with user
