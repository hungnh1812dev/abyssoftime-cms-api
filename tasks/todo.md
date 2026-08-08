# Todo: JWT Access Token — Cookie → Authorization: Bearer Header

Full detail/acceptance-criteria/verification per task lives in `tasks/plan.md`. Spec: `SPEC.md`.
Check off here as each task completes.

## Phase 1: Backend core transport change
- [x] 1. `JwtStrategy` extractor → `Authorization: Bearer`; `AuthController` login/refresh return
      `accessToken` in body, stop setting `access_token` cookie; `logout` stops clearing it;
      `auth-response.dto.ts` gains `accessToken`; `JwtAuthGuard` load-bearing-order comment
- [ ] **Checkpoint** — Phase 2 (below) must land before this is considered done

## Phase 2: Prove the conflict is resolved
- [x] 2. New e2e regression test: JWT-as-Bearer succeeds, API-token-as-Bearer still succeeds,
      garbage Bearer 401s — same `JwtAuthGuard`-protected route
- [x] **Checkpoint** — lint/test/test:e2e/build clean in `apps/cms-api`; manual curl check
      (login → `accessToken` in body, no `access_token` cookie); human review before Phase 3/4

## Phase 3: Backend docs/Swagger sweep (parallel-safe with Phase 4)
- [x] 3. `@ApiCookieAuth()` → `@ApiBearerAuth()` across the 9 affected controllers;
      `configure-app.ts` drops `addCookieAuth("access_token", ...)`
- [x] 4. Update `docs/documents/auth.md` + the 3 `docs/diagrams/*.md` flow diagrams

## Phase 4: Frontend (`cms-admin`)
- [ ] 5. `lib/api.ts` — in-memory token holder + request interceptor + capture token from
      `/auth/refresh` response
- [ ] 6. `AuthContext.tsx` + `LoginPage.tsx` — wire token capture on login/mount-refresh, clear on
      logout
- [ ] 7. Update `api.test.ts` + `AuthContext.test.tsx`; spot-check `RouteGuards.test.tsx` /
      `LoginPage.test.tsx`
- [ ] **Checkpoint** — lint/test/build clean in `apps/cms-admin`; live browser walkthrough (login,
      reload, logout); human review before final closeout

## Final
- [ ] Full regression: both apps lint/test/build clean; SPEC.md Success Criteria re-checked
- [ ] Confirm with human: delete/archive `SPEC.md` + `tasks/plan.md` + `tasks/todo.md` once shipped
