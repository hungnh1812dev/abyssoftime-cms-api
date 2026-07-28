# Todo — `GET /api/v1/auth/me`

See `tasks/plan.md` for full context and rationale.

## Phase 1 — Spec correction + response DTO
- [x] Fix `SPEC.md` decision #3 (`findById` returns `null`, doesn't throw) + `auth-me-techstack.md` if needed
- [x] `me-response.dto.ts` (new) — `MeResponseDto` (UserResponseDto fields + `role: RoleResponseDto | null`)
- [x] **Checkpoint 1:** `bun run build` succeeds

## Phase 2 — Service + controller (vertical slice)
- [x] `get-me.service.ts` (new) — `execute(sub)`: missing user → 401; `roleId: null` → `role: null`; missing
      role → 404; else `{ user, role }`
- [x] `get-me.service.spec.ts` (new) — happy path, null-role path, 401 path, 404 path
- [x] `auth.controller.ts` — add `GET auth/me` (`JwtAuthGuard` only, `@ApiCookieAuth()` on this method only)
- [x] `auth.controller.spec.ts` — new route test
- [x] `auth.module.ts` — register `GetMeService`
- [x] **Checkpoint 2:** `bun run lint && bunx jest src/modules/auth && bun run build` green; manual
      login → `/auth/me` check against `bun run start:dev` — commit

## Phase 3 — Docs
- [ ] `docs/documents/auth.md` — add the new endpoint
- [ ] `docs/cms-admin-integration.md` — remove "no GET /auth/me" gap, add endpoint reference
- [ ] **Checkpoint 3:** doc read-through — commit

## Phase 4 — Five-axis review + close-out
- [ ] Five-axis review (correctness / readability / architecture / security / performance)
- [ ] Address findings
- [ ] `SPEC.md` — trim back to pointer
- [ ] **Checkpoint 4 (final):** all checks green — commit
