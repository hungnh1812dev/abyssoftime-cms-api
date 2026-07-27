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

- [x] New `presentation/dto/content-type-response.dto.ts` (`FieldDefinitionResponseDto` self-
      referential for nested component fields, `ContentTypeSummaryResponseDto`,
      `ContentTypeResponseDto` extends it) — caught a real TS1272 build error requiring `import
      type` for the `FieldType` union used in a decorated property
- [x] `content-type.controller.ts` — `@ApiTags("content-types")` + class-level `@ApiCookieAuth()`
      (guarded, read-only); `GET /` 200; `GET /:slug` 200/400(unsafe slug)/404; class-level comment
      notes the deliberate no-write-route design
- [x] **Checkpoint 7:** `bun run build && bun run test src/modules/content-type` green (14 suites,
      101 tests)

## Phase 8 — `document` module (3 controllers)

- [x] `save-document.dto.ts` / `bulk-create.dto.ts` / `bulk-delete.dto.ts` / `list-query.dto.ts` —
      `save-document.dto.ts`'s `data` documented as `type: "object", additionalProperties: true`
      with a description pointing at `GET /api/content-types/:slug` for the real per-type schema
- [x] New `presentation/dto/document-response.dto.ts` — `DocumentDataResponseDto`,
      `DocumentResponseDto`, `PublishStatusResponseDto`, `ListedDocumentItemResponseDto`,
      `ListDocumentsResponseDto`, `BulkCreateResponseDto`, `BulkDeleteFailureDto`,
      `BulkDeleteResponseDto` — all documentation-only, mirroring the existing plain-object return
      shapes (an index-signature field can't carry `@ApiProperty` in TS, so
      `DocumentDataResponseDto` documents that via a class-level comment instead)
- [x] `single-type-document.controller.ts` — `@ApiTags("documents-single-type")` + class-level
      `@ApiCookieAuth()`; `GET` 200/404; `PUT` 200; `POST /publish` 200/400(Mode B); `POST
      /unpublish` 200/400(Mode B)
- [x] `collection-type-document.controller.ts` — `@ApiTags("documents-collection-type")` +
      class-level `@ApiCookieAuth()`; the `/bulk` route-ordering footgun noted in a class comment;
      all 9 routes annotated with real status codes
- [x] `public-document.controller.ts` — `@ApiTags("documents-public")`; **no** `@ApiCookieAuth()`
      (no guards); both routes 200/404
- [x] **Checkpoint 8:** `bun run build` green; full suite `bun run test` green (116 suites, 646
      tests — matches the pre-change baseline exactly, confirming zero behavior change); one
      unrelated pre-existing 1ms timestamp flake in
      `bulk-create-publish.service.spec.ts` reproduced and confirmed untouched by this diff (passes
      on retry)

## Phase 9 — Manual verification

- [x] `bun run start:dev`, `curl /api-docs` (200) and `/api-docs-json` — confirmed all 10 module
      tags present (`access-tokens`, `auth`, `content-types`, `documents-collection-type`,
      `documents-public`, `documents-single-type`, `media`, `permissions`, `roles`, `users`), 35
      paths / 47 operations, both `cookie`/`bearer` security schemes registered, and every
      `auth`/`documents-public` route correctly shows no security requirement
- [x] `bun run lint` clean (only the pre-existing unrelated `main.ts` warning)

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
