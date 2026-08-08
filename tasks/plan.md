# Plan: JWT Access Token — Cookie → `Authorization: Bearer` Header

See `SPEC.md` (repo root) for the full spec. See `tasks/todo.md` for the checklist to track progress.

## Context

`SPEC.md` defines the target: the access token stops being an httpOnly `access_token` cookie and
instead comes back in the `login`/`refresh` JSON response body, gets held in memory by
`cms-admin`, and is sent as `Authorization: Bearer <token>` on every request. The refresh token is
explicitly unchanged — still a server-set httpOnly cookie, still verified by the untouched
`JwtRefreshStrategy`/`JwtRefreshGuard`.

The one real risk this plan exists to de-risk: `JwtAuthGuard = AuthGuard(["jwt", "api-token"])`
already shares route protection between two Passport strategies. Today `jwt` reads a cookie and
`api-token` reads the `Authorization` header, so they never compete. After this change both read
the same header. Traced through `@nestjs/passport`'s `auth.guard.js`, Passport tries `"jwt"` first
and falls through to `"api-token"` on a `fail()` (not `error()`) — which is what `passport-jwt`
does on a malformed-JWT decode. API tokens are always `cms_<64-hex>` (from
`generateAccessTokenSecret`), never dot-segmented, so they can never parse as a JWT. No strategy
logic changes needed — but strategy order becomes load-bearing, and this plan adds an explicit
regression test proving both paths still work through the shared header.

## Architecture Decisions

- **Refresh token untouched.** Confirmed with user: stays httpOnly-cookie-only. Nothing in
  `jwt-refresh.strategy.ts` / `jwt-refresh.guard.ts` / `refresh-token.service.ts` changes.
- **Backend core change ships as one atomic unit.** `JwtStrategy`'s extractor swap and
  `AuthController`'s login/refresh no-longer-setting-the-cookie change cannot be split across
  separate deployable tasks — either alone breaks auth (extractor-only: nothing can authenticate
  since the cookie has the token but the strategy no longer reads it; controller-only: the token
  never reaches the client that needs it in the header). Task 1 is intentionally a single ~6-file
  task rather than the usual ≤5-file guideline, for exactly this reason.
- **Conflict regression proven with a real Nest app, not a controller unit test.** Guard/strategy
  wiring can't be exercised through `Test.createTestingModule({ controllers: [...] })`-style
  controller tests (those bypass guards). `test/content-engine.e2e-spec.ts` already establishes the
  pattern this repo uses for this: `bootTestApp()` (from `test/utils/app-test.util.ts`) to boot the
  full `AppModule` against the test DB, `JwtTokenService.signAccessToken()` to mint a real JWT
  directly (no need to drive the full register/verify/login HTTP flow just to get a token), and
  `CreateAccessTokenService`/`ACCESS_TOKEN_REPOSITORY` to mint a real API token. Task 2 reuses this
  exact pattern.
- **Swagger/docs sweep is mechanical and independent.** `@ApiCookieAuth()` → `@ApiBearerAuth()`
  across ~9 controllers and `configure-app.ts`'s Swagger config is a pure find-and-replace with no
  runtime behavior change — it can proceed in parallel with frontend work, not gated on it.
- **Frontend token holder lives in `lib/api.ts`, not React state.** `AuthContext.tsx` already
  documents (in a comment) that "both tokens live only in HttpOnly cookies" — that comment and the
  surrounding logic need to change, but the token itself belongs in a module-level variable in
  `lib/api.ts` (same file that owns the Axios instance and interceptors) so the interceptor can read
  it without a React dependency. `AuthContext` reads/writes it through exported setter functions,
  matching the existing `onSessionExpired`/`_onSessionExpired` pattern already in that file.
- **No new axios type augmentation.** The codebase already threads ad-hoc config flags (`_retried`)
  through `as object` casts rather than a `declare module "axios"` augmentation — follow that same
  loose pattern for any new request-config needs, don't introduce a new convention.

## Task List

### Phase 1: Backend core transport change

- [x] **Task 1: Access token moves to `Authorization: Bearer` — strategy, controller, DTO**
  - **Description:** `JwtStrategy`'s extractor switches from the `access_token` cookie
    (`jwtCookieExtractor`) to `ExtractJwt.fromAuthHeaderAsBearerToken()` (from `passport-jwt`).
    `AuthController.login`/`refresh` stop calling `res.cookie(ACCESS_TOKEN_COOKIE, ...)` and instead
    return `accessToken` in the JSON body; `logout` stops calling
    `res.clearCookie(ACCESS_TOKEN_COOKIE)` (refresh-token cookie clearing is unchanged). A new
    field is added to the login/refresh response DTO. `JwtAuthGuard` gets a comment noting the
    `["jwt", "api-token"]` order is now load-bearing (see Context above) — no logic change there.
  - **Acceptance criteria:**
    - [x] `POST /auth/login` response body is `{ message, accessToken }`; no `Set-Cookie:
      access_token` header is present; `Set-Cookie: refresh_token` is unchanged.
    - [x] `POST /auth/refresh` behaves the same way with a rotated `accessToken`.
    - [x] `POST /auth/logout` no longer clears `access_token`; still clears `refresh_token`.
    - [x] A request to any `JwtAuthGuard`-protected route with `Authorization: Bearer <validJwt>`
      succeeds; a request with the old cookie and no header now gets 401 (`Missing access token`).
  - **Verify:**
    - [x] `bun run test -- jwt.strategy` and `bun run test -- auth.controller` pass with updated
      expectations (extractor reads header not cookie; controller asserts response body has
      `accessToken` and asserts `res.cookie` was called only once, for `refresh_token`).
    - [x] `bun run build`
  - **Dependencies:** None.
  - **Files:**
    - `apps/cms-api/src/common/strategies/jwt.strategy.ts`
    - `apps/cms-api/src/common/strategies/jwt.strategy.spec.ts`
    - `apps/cms-api/src/common/guards/jwt-auth.guard.ts` (comment only)
    - `apps/cms-api/src/modules/auth/presentation/auth.controller.ts`
    - `apps/cms-api/src/modules/auth/presentation/auth.controller.spec.ts`
    - `apps/cms-api/src/modules/auth/presentation/dto/auth-response.dto.ts`
  - **Estimated scope:** Large (6 files) — accepted as one atomic unit per the Architecture
    Decisions above.

### Phase 2: Prove the conflict is actually resolved

- [x] **Task 2: Bearer-header conflict regression test**
  - **Description:** New e2e test (following `test/content-engine.e2e-spec.ts`'s
    `bootTestApp()` + `JwtTokenService`/`CreateAccessTokenService` pattern) that boots the real
    `AppModule` and, against one `JwtAuthGuard`-protected route (e.g. `GET /auth/me`, or
    `GET /api/v1/roles` if `me` proves inconvenient to seed), asserts: (a) a JWT minted via
    `JwtTokenService.signAccessToken()` sent as `Authorization: Bearer <jwt>` succeeds, (b) an API
    token minted via `CreateAccessTokenService`/`ACCESS_TOKEN_REPOSITORY` sent the same way
    succeeds, (c) a garbage/opaque non-JWT, non-API-token Bearer value gets 401.
  - **Acceptance criteria:**
    - [x] All three cases in the new spec pass.
    - [x] Test fails (red) if the extractor change from Task 1 were reverted — i.e. it actually
      exercises the header path, not a stale cookie path.
  - **Verify:**
    - [x] The project's e2e test script (confirm exact name in `apps/cms-api/package.json` — likely
      `bun run test:e2e`) passes, including the new spec.
  - **Dependencies:** Task 1.
  - **Files:**
    - `apps/cms-api/test/auth-bearer-conflict.e2e-spec.ts` (new)
  - **Estimated scope:** Small (1 file).

### Checkpoint: Backend core + conflict proof
- [x] `bun run lint`, `bun run test`, `bun run test:e2e`, `bun run build` all clean in `apps/cms-api`.
- [x] Manual check: `curl` login → response body has `accessToken`, no `access_token` cookie in
  `Set-Cookie`; a follow-up authenticated call with `Authorization: Bearer <that token>` succeeds.
- [ ] Review with human before proceeding to Phase 3/4 (can run in parallel after this point).

### Phase 3: Backend docs/Swagger sweep (parallel-safe with Phase 4)

- [x] **Task 3: Swagger decorators + config**
  - **Description:** Replace `@ApiCookieAuth()` with `@ApiBearerAuth()` on every route currently
    documenting access-token cookie auth. This is the same one-line substitution repeated across:
    `auth.controller.ts` (`me`), `content-type.controller.ts`, `access-token.controller.ts`,
    `role.controller.ts`, `collection-type-document.controller.ts`,
    `single-type-document.controller.ts`, `permission.controller.ts`, `user.controller.ts`,
    `media.controller.ts`. In `bootstrap/configure-app.ts`, drop
    `.addCookieAuth("access_token", ...)` from `configureSwagger`, keep the existing
    `.addBearerAuth()`.
  - **Acceptance criteria:**
    - [x] No `@ApiCookieAuth()` reference tied to the access token remains (`grep -rn
      "ApiCookieAuth"` returns nothing, or only intentional non-access-token uses if any exist).
    - [x] Swagger UI at `/api-docs` shows Bearer auth, not cookie auth, for the affected routes.
  - **Verify:**
    - [x] `bun run build` (Swagger document generation runs at boot — confirm no runtime error).
    - [x] `bun run lint`.
  - **Dependencies:** Task 1 (so the docs describe the shipped behavior, not the old one) — can
    start in parallel and land after Task 1 merges.
  - **Files:** the 9 controllers listed above + `apps/cms-api/src/bootstrap/configure-app.ts`.
  - **Estimated scope:** Medium (mechanical, ~10 files, one-line change each).

- [ ] **Task 4: Backend narrative docs**
  - **Description:** Update `docs/documents/auth.md` and the three diagrams in
    `docs/diagrams/` (`login-flow-diagram.md`, `refresh-token-flow-diagram.md`,
    `auth-jwt-flow-diagram.md`) so none of them describe an `access_token` cookie — reflect the
    response-body-then-header flow instead. Keep each diagram's existing scope/structure; just
    correct the parts that reference cookie-set/cookie-read for the access token specifically.
  - **Acceptance criteria:**
    - [ ] No remaining prose/diagram step says the access token is set or read as a cookie.
    - [ ] Refresh-token cookie behavior in these docs is left as-is (still accurate, unchanged).
  - **Verify:** Manual read-through against the shipped Task 1 behavior.
  - **Dependencies:** Task 1.
  - **Files:**
    - `apps/cms-api/docs/documents/auth.md`
    - `apps/cms-api/docs/diagrams/login-flow-diagram.md`
    - `apps/cms-api/docs/diagrams/refresh-token-flow-diagram.md`
    - `apps/cms-api/docs/diagrams/auth-jwt-flow-diagram.md`
  - **Estimated scope:** Medium (4 files, prose/diagram edits).

### Phase 4: Frontend (`cms-admin`) — vertical slice: user logs in and stays authenticated via header

- [ ] **Task 5: In-memory token holder + request interceptor**
  - **Description:** In `lib/api.ts`, add a module-level access-token holder with
    `setAccessToken(token: string | null)` / a way for the request interceptor to read it —
    mirroring the existing `onSessionExpired`/`_onSessionExpired` module-variable pattern already
    in this file. Add an Axios **request** interceptor that attaches `Authorization: Bearer
    <token>` when a token is held (alongside the existing **response** interceptor, unchanged:
    `withCredentials: true` stays, since the refresh-token cookie still needs to ride along).
    Update `refreshSession()` to capture `accessToken` from the `/auth/refresh` response and call
    `setAccessToken(...)` before resolving, so the retried request in the response interceptor
    picks up the new token.
  - **Acceptance criteria:**
    - [ ] A request made while a token is held carries `Authorization: Bearer <token>`.
    - [ ] A request made with no token held carries no `Authorization` header.
    - [ ] After a 401-triggered refresh, the retried request uses the newly-captured token, not the
      stale one.
  - **Verify:**
    - [ ] `bun run test -- api.test` (updated, see Task 7) passes.
  - **Dependencies:** Task 1 (needs the real response shape to build against, though it can be
    stubbed earlier if desired).
  - **Files:** `apps/cms-admin/src/lib/api.ts`.
  - **Estimated scope:** Small (1 file).

- [ ] **Task 6: Wire token capture through AuthContext and LoginPage**
  - **Description:** `AuthContext.tsx`'s mount-time `attemptMountSession` already calls `POST
    /auth/refresh` before `fetchMe()` — capture the returned `accessToken` and hand it to
    `setAccessToken` (from Task 5) before calling `fetchMe()` (which now needs a valid header to
    succeed, since `/auth/me` is `JwtAuthGuard`-protected). Update the stale comment ("both tokens
    live only in HttpOnly cookies"). `login()` currently only calls `fetchMe()` after the caller's
    own `POST /auth/login` — since `LoginPage.tsx` owns that call, have `LoginPage.tsx` capture
    `accessToken` from the login response and pass it into `login(accessToken)`, which then calls
    `setAccessToken` before `fetchMe()` (smallest diff, keeps `LoginPage`'s existing `useMutation`
    structure intact). `logout()` should also call `setAccessToken(null)` to clear the in-memory
    token alongside its existing state clear.
  - **Acceptance criteria:**
    - [ ] After `POST /auth/login` succeeds, `GET /auth/me` (called by `login()`/`fetchMe()`)
      succeeds using the header, not a cookie.
    - [ ] After a page reload, `attemptMountSession`'s refresh-then-me sequence still works purely
      off the httpOnly refresh cookie (no token needed to *initiate* it) and ends with a token held
      in memory.
    - [ ] `logout()` leaves no token held (verified by the next request having no `Authorization`
      header).
  - **Verify:** Manual browser walkthrough (see Checkpoint below) plus the updated unit tests from
    Task 7.
  - **Dependencies:** Task 5.
  - **Files:**
    - `apps/cms-admin/src/context/AuthContext.tsx`
    - `apps/cms-admin/src/pages/auth/LoginPage.tsx`
  - **Estimated scope:** Small (2 files).

- [ ] **Task 7: Frontend test updates**
  - **Description:** Update `api.test.ts` to cover: request interceptor attaches the header when a
    token is set via `setAccessToken`; `/auth/refresh` mock response including `accessToken`
    results in the token being captured and used on the retried request. Update
    `AuthContext.test.tsx` for the new token-capture step in `attemptMountSession` and `login()`.
    Spot-check `RouteGuards.test.tsx` and `LoginPage.test.tsx` (likely unaffected since they mock
    `useAuth`/`AuthContext` directly rather than hitting `lib/api.ts`, but confirm rather than
    assume).
  - **Acceptance criteria:**
    - [ ] New/updated tests pass and meaningfully fail if the header-attachment or capture logic is
      reverted (i.e. not just re-asserting mocks).
  - **Verify:**
    - [ ] `bun run test` (full `cms-admin` suite) passes.
    - [ ] `bun run lint`.
  - **Dependencies:** Task 5, Task 6.
  - **Files:**
    - `apps/cms-admin/src/lib/__tests__/api.test.ts`
    - `apps/cms-admin/src/context/__tests__/AuthContext.test.tsx`
    - (spot-check only, edit if actually affected) `apps/cms-admin/src/components/__tests__/RouteGuards.test.tsx`,
      `apps/cms-admin/src/pages/auth/__tests__/LoginPage.test.tsx`
  - **Estimated scope:** Small–Medium (2 files edited, 2 spot-checked).

### Checkpoint: Frontend integration
- [ ] `bun run lint`, `bun run test`, `bun run build` clean in `apps/cms-admin`.
- [ ] Manual browser walkthrough against the running backend: login → Network tab shows
  `accessToken` in the login response body and no `access_token` cookie; subsequent API calls
  (e.g. loading `/admin`) carry `Authorization: Bearer ...`; hard-reload the page → session
  survives via the refresh-token cookie and a fresh token is re-acquired; logout → subsequent calls
  carry no `Authorization` header and protected routes redirect to login.
- [ ] Review with human before final closeout.

### Final Checkpoint: Full regression
- [ ] Both `apps/cms-api` and `apps/cms-admin`: lint, test, build all clean.
- [ ] Re-run the SPEC.md Success Criteria checklist end-to-end.
- [ ] Per this project's established closeout habit: once merged and verified, confirm with the
  human whether `SPEC.md`/`tasks/plan.md`/`tasks/todo.md` (this initiative's, at repo root) get
  deleted or archived — matching how prior finished initiatives in `apps/cms-api/tasks/` and
  `apps/cms-admin/tasks/` were closed out.

## Risks and Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Task 1 shipped without Task 2's regression test merged in the same PR | Medium — the one thing this whole spec exists to de-risk goes unverified | Sequence Task 2 immediately after Task 1, before touching frontend; don't treat Phase 1 as "done" until the checkpoint passes |
| `AuthContext`'s mount-time flow now has a real ordering dependency (must call `setAccessToken` before `fetchMe()`, not after) | High if missed — `/auth/me` would 401 on every fresh page load | Called out explicitly in Task 6; verified by the manual reload check in the Frontend Integration checkpoint |
| Existing consumers (scripts, Postman collections, other API clients) relying on the `access_token` cookie | Medium, outside this repo's tests | Not discoverable via static analysis of this monorepo; flag to human at the Backend checkpoint review — anyone else calling this API needs to know before this ships |
| Exact e2e test script name/DB requirements unconfirmed | Low — blocks Task 2 verification only | Confirm exact script name and any required test-DB setup in `apps/cms-api/package.json` at Task 2 start |

## Open Questions

- Exact e2e test script name and any test-DB bootstrap needed — confirm from
  `apps/cms-api/package.json` when starting Task 2 (not blocking plan approval).
- What to do with `SPEC.md`/`tasks/plan.md`/`tasks/todo.md` after this ships — noted in the Final
  Checkpoint, deferred to human decision at that point rather than assumed now.
