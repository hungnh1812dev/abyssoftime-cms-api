# Todo — Swagger/OpenAPI Documentation

See `tasks/plan.md` for full context, build order, and confirmed decisions.

## Phase 0 — Dependency + bootstrap wiring

- [x] `bun add @nestjs/swagger` (`11.4.6`)
- [x] `src/bootstrap/configure-app.ts` — `DocumentBuilder().setTitle("Abyssoftime CMS
      API").setDescription(...).setVersion("0.0.1").addCookieAuth("access_token",
      {...}).addBearerAuth().build()`, `SwaggerModule.createDocument` +
      `SwaggerModule.setup("api-docs", app, document)`
- [x] **Checkpoint 0:** `bun run build` succeeds; `bun run start:dev` + `curl localhost:3000/api-docs`
      confirmed `200` against the real dev DB; `bun run lint` clean (pre-existing unrelated
      `main.ts` warning only); `configure-app.spec.ts` (6 tests) still green

## Phase 1 — `permissions` module

- [x] `create-permission.dto.ts` / `update-permission.dto.ts` — `@ApiProperty`/`@ApiPropertyOptional`
      per field (slug pattern example `"document:read"`, name/description examples)
- [x] New `presentation/dto/permission-response.dto.ts` (domain entities stay undecorated;
      controller still returns the real `PermissionEntity`)
- [x] `permission.controller.ts` — `@ApiTags("permissions")` + class-level `@ApiCookieAuth()`; `GET`
      200; `POST` 201/409; `PUT` 200/404; `DELETE` 204/404/409 (still-referenced, incl. schema)
- [x] **Checkpoint 1:** `bun run build && bun run test` green (permissions suite: 7/7, 27 tests)

## Phase 2 — `roles` module

- [x] `create-role.dto.ts` / `update-role.dto.ts` — properties incl. `level` (`0`-`100` range in
      the property doc), `permissions` array
- [x] New `presentation/dto/role-response.dto.ts`
- [x] `role.controller.ts` — `@ApiTags("roles")` + class-level `@ApiCookieAuth()`; `GET` 200;
      `POST` 201/400(unknown permission slug)/409; `PUT` 200/400/404; `DELETE` 204/400/404/409
      (still-assigned-to-users)
- [x] **Checkpoint 2:** build green (verified together with Phase 3 below)

## Phase 3 — `users` module

- [x] `create-user.dto.ts` / `update-user.dto.ts` — noted in the property doc that `password` is
      round-tripped in plaintext by this module (pre-existing gap, not something Swagger should
      paper over) — obvious placeholder example (`"changeme123"`), not a realistic-looking secret
- [x] `user-response.dto.ts` — decorated directly (already the real runtime return type, strips
      sensitive fields)
- [x] `user.controller.ts` — `@ApiTags("users")` + class-level `@ApiCookieAuth()`; `POST` 201/409;
      `PUT` 200/403(level-hierarchy/super-admin-promotion)/404/409; `DELETE` 204/403/404
- [x] **Checkpoint 3:** `bun run build && bun run test src/modules/roles src/modules/users` green
      (16 suites, 114 tests)

## Phase 4 — `access-tokens` module

- [x] `create-access-token.dto.ts` / `revoke-access-token.dto.ts` — `expiresIn` enum values as the
      property's `enum`; never a real token example
- [x] New `presentation/dto/access-token-response.dto.ts` (`AccessTokenResponseDto` for list,
      `AccessTokenSecretResponseDto` for create/revoke) — replaced the controller's two local
      plain-object interfaces with these classes (same shape, zero behavior change)
- [x] `access-token.controller.ts` — `@ApiTags("access-tokens")` + class-level `@ApiCookieAuth()`;
      `GET` 200 (no `token` field); `POST` 201/400(unknown slug); `POST /:id/revoke`
      200/400/404; `DELETE` 204/404
- [x] **Checkpoint 4:** verified together with Phases 5-6 below

## Phase 5 — `auth` module

- [x] All 6 DTOs (`register`/`login`/`verify-otp`/`resend-otp`/`forgot-password`/`reset-password`)
      — placeholder examples only (`"user@example.com"`, `"SecurePass123!"`, OTP `"123456"`), never
      anything resembling a real credential
- [x] New `presentation/dto/auth-response.dto.ts` (`MessageResponseDto`, `HasUsersResponseDto`)
- [x] `auth.controller.ts` — `@ApiTags("auth")`; **no** `@ApiCookieAuth()` anywhere (every route is
      public); a class-level comment documents that login/refresh set cookies and logout clears
      them (Swagger has no first-class "sets a cookie" decorator); status codes: register 201/409;
      verify-otp 200/400/404/409; resend-otp 200/404/409; has-users 200; login 200/401/403; refresh
      200/401; logout 200; forgot-password 200; reset-password 200/400
- [x] **Checkpoint 5:** verified together with Phases 4/6

## Phase 6 — `media` module

- [x] New `presentation/dto/media-asset-response.dto.ts`
- [x] `media.controller.ts` — `@ApiTags("media")` + class-level `@ApiCookieAuth()`; `upload` gets
      `@ApiConsumes("multipart/form-data")` + `@ApiBody({ schema: { type: "object", properties: {
      file: { type: "string", format: "binary" } } } })` (no DTO class exists for this route — it's
      Multer-handled); `GET` 200; `POST /upload` 201/400(no file)/413/422; `DELETE` 204/404
- [x] **Checkpoint 4-6:** `bun run build && bun run test src/modules/access-tokens
      src/modules/auth src/modules/media` green (30 suites, 131 tests)

## Phase 7 — `content-type` module

- [ ] `content-type.controller.ts` — `@ApiTags("content-types")`; both routes `@ApiCookieAuth()`
      (guarded, read-only); `GET /` 200 (`ContentTypeSummary[]`); `GET /:slug` 200/400(unsafe
      slug)/404 — note in the class-level description that this module has no write route by
      design (per `content-type.md`), so Swagger correctly shows only 2 GETs
- [ ] **Checkpoint 7:** build/lint/test:cov green

## Phase 8 — `document` module (3 controllers)

- [ ] `save-document.dto.ts` / `bulk-create.dto.ts` / `bulk-delete.dto.ts` / `list-query.dto.ts` —
      properties; note `save-document.dto.ts`'s `data` is intentionally a loose `object` (schema
      fields are dynamic per content type, see `document.md`) — document that in the property
      description rather than trying to type it more tightly
- [ ] `single-type-document.controller.ts` — `@ApiTags("documents-single-type")`; all 4 routes
      `@ApiCookieAuth()`; `GET` 200/404; `PUT` 200; `POST /publish` 200/400(Mode B); `POST
      /unpublish` 200/400(Mode B)
- [ ] `collection-type-document.controller.ts` — `@ApiTags("documents-collection-type")`; all 9
      routes `@ApiCookieAuth()`; note the `/bulk` route-ordering footgun in the class description
      (informational only, doesn't change behavior); `GET` 200; `POST /bulk` 201; `DELETE /bulk`
      200; `POST` 201; `GET /:documentId` 200/404; `PUT /:documentId` 200; `DELETE /:documentId`
      204; `POST /:documentId/publish` 200/400; `POST /:documentId/unpublish` 200/400; `POST
      /:documentId/duplicate` 201/404
- [ ] `public-document.controller.ts` — `@ApiTags("documents-public")`; **no** `@ApiCookieAuth()`
      (no guards per `document.md`); both routes 200/404
- [ ] **Checkpoint 8:** build/lint/test:cov green

## Phase 9 — Manual verification

- [ ] `bun run start:dev`, browse `/api-docs`, confirm all 10 tags appear with every route listed,
      cookie-lock icon shown only on the guarded routes/tags, `auth`/`public-document` show no lock
- [ ] Confirm `bun run test:cov` shows no changed assertions vs. pre-change baseline (decorator-only
      diff, zero runtime behavior change)

## Phase 10 — Update spec/docs

- [ ] New `docs/documents/swagger.md` — mirrors this plan's Context section once the feature is
      actually built (dependency version installed, exact bootstrap file touched, final route/tag
      list)
- [ ] `docs/ENTRYPOINT.md` — add the new doc file's index entry
- [ ] Trim `SPEC.md` back to a one-line pointer at `docs/documents/swagger.md`, per the "Root docs"
      rule

## Phase 11 — Review + cleanup

- [ ] Five-axis code review (`agent-skills:code-reviewer`)
- [ ] Apply any Critical/Important findings
- [ ] Delete this cycle's `SPEC.md` content back down to the "No active spec" pointer form (already
      done in Phase 10, just confirm) — no `/specs/*.md` file exists in this repo's convention to
      separately delete (per `docs/rules/workflow.md`'s cleanup step, SPEC.md itself is the artifact
      that gets trimmed, matching the previous cycle's own closeout)
