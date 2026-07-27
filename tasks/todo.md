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

- [x] `update-user.dto.ts` — shrink to `name?`/`password?` only
- [x] `update-user.service.ts` — delete email/username uniqueness block, level-hierarchy block,
      new-role-check block; drop unused `ROLE_REPOSITORY` injection/`IRoleRepository`
      import/`SUPER_ADMIN_ROLE_SLUG`; add self-or-`user:manager` check after the 404 lookup;
      `users.update(...)` now only passes `name`/`password`
- [x] `user.controller.ts` — on `PUT :id`, remove `@RequirePermissions("user:manager")` and drop
      `PermissionsGuard` from `@UseGuards` (keep `JwtAuthGuard` only); update 403 `@ApiResponse`
      description. (`Patch` import for Phase 3 deferred to that phase.)
- [x] `update-user.service.spec.ts` — rewritten: role-repository mocking and all hierarchy/new-role-
      check cases removed (behavior no longer exists); added self-update-allowed,
      other-user-with-`user:manager`, other-user-without-permission-403, and `users.update` called
      with only `name`/`password` cases
- [x] `user.controller.spec.ts` — no change needed: its `update()` test only asserts delegation to
      `UpdateUserService.execute(documentId, dto, req.user)`, which is unchanged; guard behavior
      isn't exercised at this level (per existing convention)
- [x] **Checkpoint 2:** `bun run build && bun run test src/modules/users && bun run lint` green
      (expect deliberate test-count changes vs. baseline — old hierarchy cases removed); confirm
      before committing

## Phase 3 — Role-assignment endpoint

- [x] New `update-user-role.dto.ts` — `{ roleId: string }` (`@ApiProperty`, `@IsString`,
      `@IsNotEmpty`)
- [x] New `update-user-role.service.ts` — inject `USER_REPOSITORY` + `ROLE_REPOSITORY`; 404 user not
      found → 404 `dto.roleId` not resolved → level-hierarchy check vs. target's current role (if
      any) → new-role check (super_admin-promotion carve-out, else `caller.level` > new role's level)
      → `users.update(documentId, { roleId })` → return updated entity
- [x] `user.controller.ts` — added `PATCH /:id/role`, `@UseGuards(JwtAuthGuard, PermissionsGuard)`,
      `@RequirePermissions("user:role_manager")`, `@Req() req: AuthenticatedRequest`, returns
      `UserResponseDto.fromEntity(...)`; `@ApiOperation`/`@ApiResponse` (200/403/404)
- [x] `user.module.ts` — added `UpdateUserRoleService` to `providers`; also updated
      `user.module.spec.ts`'s provider-list assertion (not anticipated in the original plan, but
      needed once the new service was registered)
- [x] `seed-default-data.service.ts` — added `{ slug: "user:role_manager", name: "Manage user roles",
      description: "Assign roles to users" }` to `DEFAULT_PERMISSIONS`; added `"user:role_manager"` to
      `super_admin`'s permissions only (not `admin`)
- [x] New `update-user-role.service.spec.ts` — hierarchy/new-role-check cases relocated from Phase 2's
      removed tests, renamed to the new SUT, plus the new roleId-not-found 404 case. Skipped the
      `coverageThreshold` sub-item — this repo's Jest config (`package.json`) has no
      `coverageThreshold` key at all, so there's no existing per-path convention to extend.
- [x] `user.controller.spec.ts` — added one `PATCH /:id/role` delegation test, matching this file's
      existing one-test-per-route convention (permission/hierarchy edge cases are covered at the
      service-spec level, not re-asserted here for the other routes either)
- [x] `seed-default-data.service.spec.ts` — bumped `toHaveBeenCalledTimes(17)`→`18` and `(16)`→`17`;
      added slug to `createdSlugs` and `superAdminCall.permissions`; confirmed `adminCall.permissions`
      unchanged
- [x] **Checkpoint 3:** `bun run build && bun run test && bun run lint` green (645 tests, 117 suites);
      confirm before committing

## Phase 4 — Manual verification, docs, spec cleanup

- [x] `bun run start:dev` + manual smoke test against a real dev DB: create user (POST, confirmed
      fixed accountType:false/verified:false/roleId:null in response), self-verify via
      resend-otp/verify-otp into `guest` (proves the admin-created path works exactly like
      self-registration), self-update (PUT, no `user:manager`), admin-update another user (PUT, with
      `user:manager`), immutable-field rejection (posting `email`/`roleId` to `PUT :id` → `400`
      whitelist error), role-assign as `super_admin` (PATCH, 200 after bumping this dev DB's
      pre-existing `super_admin` role — the seeder only creates missing roles, doesn't patch existing
      ones' permissions, a pre-existing limitation unrelated to this feature); confirmed
      `/api-docs-json` shows 36 paths/48 operations with the new route and reduced DTO schemas
- [x] `docs/documents/users.md` — rewrote Entity/DTOs/Services/Endpoints sections; removed the
      now-closed "no roleId existence check" Known Gap; documented the new endpoint, self-or-manager
      rule, `user:role_manager`, and the seeder-doesn't-patch-existing-roles gap found during the
      smoke test
- [x] `docs/documents/permissions.md`/`docs/documents/roles.md` — checked both; neither enumerates
      individual permission slugs or a role's literal permission list (that lives in each consuming
      module's own doc, e.g. `document:read` is only in `document.md`), so no edit needed — skipped,
      deviating from the original plan item which assumed otherwise
- [x] `docs/documents/swagger.md` — bumped "35 paths, 47 operations" → "36 paths, 48 operations" in
      the Coverage section (left the dated "Verified state" section as-is — historical snapshot of
      the swagger cycle itself, not a living count)
- [x] `SPEC.md` — trimmed to one-line pointer at `docs/documents/users.md`, per "Root docs" rule
- [x] **Checkpoint 4 (final):** five-axis code review (`agent-skills:code-reviewer`) — **APPROVE**,
      zero Critical/Important findings. Three low-severity items, all applied: (1)
      `UpdateUserService` ran its 404 lookup before the self-or-manager check, letting an
      unauthorized caller distinguish existing vs. missing `documentId`s now that `PermissionsGuard`
      no longer gates this route — reordered, with a new pinning test; (2) added a defensive
      `caller.permissions ?? []` fallback matching `PermissionsGuard`'s own pattern; (3) added an
      explicit "can't reassign own role" test to `update-user-role.service.spec.ts` (previously only
      incidental coverage). Re-verified: `bun run build && bun run test && bun run lint` green (647
      tests, 117 suites). Confirm final commit(s) with user.
