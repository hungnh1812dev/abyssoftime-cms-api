# Swagger / OpenAPI Documentation

Generated API documentation for the whole app, served at `GET /api-docs` (interactive UI) and `GET /api-docs-json` (raw OpenAPI 3.0 document), via `@nestjs/swagger@11.4.6`. Mounted unconditionally in every environment — no env-gating — since every documented route is already guarded by the same `JwtAuthGuard`/`PermissionsGuard` pair that protects the routes themselves; exposing the schema doesn't expose any data.

## Bootstrap wiring

`src/bootstrap/configure-app.ts` — a `configureSwagger(app)` helper called from `configureApp`, right after the trust-proxy setup:

```ts
new DocumentBuilder()
  .setTitle("Abyssoftime CMS API")
  .setDescription(...)
  .setVersion("0.0.1") // hardcoded, matches package.json — no tsconfig resolveJsonModule change needed for this
  .addCookieAuth("access_token", { type: "apiKey", in: "cookie", name: "access_token" })
  .addBearerAuth()
  .build();
```

Kept inline in `configure-app.ts` rather than a separate file — the addition is ~15 lines, well within the file staying readable.

## Auth reality: two schemes registered, one actually used

- **`addCookieAuth("access_token", ...)`** — matches `JwtAuthGuard`'s real mechanism (reads the `access_token` httpOnly cookie, see [auth.md](./auth.md)). Every controller/route actually guarded by `JwtAuthGuard` carries `@ApiCookieAuth()` (usually class-level, since every route in a given controller shares the same guard).
- **`addBearerAuth()`** — registered so the scheme is visible in the UI, but **no route anywhere carries `@ApiBearerAuth()`**. The only bearer-checking guard, `ApiTokenGuard` (see [access-tokens.md](./access-tokens.md)), is built and unit-tested but not wired to any route in this repo — attaching the decorator to a route that isn't actually bearer-gated would misdocument it.
- `auth`'s own controller and `document`'s `public-document.controller.ts` carry **no** `@ApiCookieAuth()` at all — every route on both is genuinely public (verified live: `GET /api-docs-json` shows `security: "none"` on all 11 of those routes).

## Coverage

All 10 controllers, all 19 request DTOs, full response-shape coverage:

| Module | Tag | Controller(s) |
| --- | --- | --- |
| `permissions` | `permissions` | `permission.controller.ts` |
| `roles` | `roles` | `role.controller.ts` |
| `users` | `users` | `user.controller.ts` |
| `access-tokens` | `access-tokens` | `access-token.controller.ts` |
| `auth` | `auth` | `auth.controller.ts` |
| `media` | `media` | `media.controller.ts` |
| `content-type` | `content-types` | `content-type.controller.ts` |
| `document` | `documents-single-type` / `documents-collection-type` / `documents-public` | 3 controllers |

Live-verified: 36 paths, 48 operations (up from 35/47 after the `users` module's `PATCH /api/users/:id/role` route was added — see [users.md](./users.md)), both `cookie`/`bearer` security schemes registered in `components.securitySchemes`.

## Response-shape DTOs (documentation-only, zero behavior change)

Every module's controllers still return the real domain entity/plain-object shape at runtime — nothing about an actual HTTP response changed. Where a controller returns:

- **A real domain entity directly** (`PermissionEntity`, `RoleEntity`, `MediaAssetEntity`, `ContentTypeEntity`) — domain entities stay framework-agnostic on purpose (clean-architecture boundary), so a parallel `presentation/dto/*-response.dto.ts` class was added per module, decorated with `@ApiProperty()`, used only as the `type:` argument to `@ApiResponse()`. The controller method's actual return type annotation is untouched.
- **A pre-existing local plain-object shape** (`access-tokens`' two inline interfaces, `document`'s `DocumentResponse`/`ListDocumentsResult`/bulk response interfaces) — replaced with an equivalent decorated class of the identical shape (TypeScript's structural typing means the existing object-literal-returning code needed no changes), or referenced via a new dedicated DTO file when the original stayed as a `../document-response.mapper.ts` plain interface.
- **`UserResponseDto`** (`users` module) was the one pre-existing exception — it was already the actual runtime return type (not a documentation-only shim), so it was decorated directly instead of adding a parallel class.

`content-type`'s `FieldDefinitionResponseDto` is self-referential (`@ApiPropertyOptional({ type: () => FieldDefinitionResponseDto, isArray: true })`) to describe arbitrarily-nested component fields — Swagger's lazy-type-function pattern handles the circular reference correctly.

`document`'s `DocumentDataResponseDto` documents only the four fixed fields (`documentId`/`status`/`createdAt`/`updatedAt`) — the real response also spreads every dynamic content-type field alongside them, but TypeScript doesn't allow decorating a class's index signature, so the open-ended part is called out in a class-level comment instead of a typed property.

## A real build error caught along the way

`content-type-response.dto.ts` initially imported `FieldType` (a type alias, not a class) as a normal import for use as a decorated property's type. This failed the build with TS1272 (`isolatedModules`/`emitDecoratorMetadata` require `import type` for anything that's purely a compile-time type and used in a decorated signature) — fixed by switching to `import { type FieldType } from ...`. Worth remembering for any future DTO that decorates a property typed by a union/type-alias import rather than a class.

## Verified state (2026-07-27)

`bun run build`, `bun run lint` (only the pre-existing unrelated `main.ts` `no-floating-promises` warning), and `bun run test` (116 suites, 646 tests — identical count to the pre-change baseline) all pass. A live `bun run start:dev` + `curl`/`GET /api-docs-json` walkthrough confirmed: all 10 tags present, 35 paths / 47 operations, both security schemes registered, and every `auth`/`documents-public` route correctly shows no security requirement. One unrelated, pre-existing 1ms timestamp flake in `bulk-create-publish.service.spec.ts` (untouched by this diff) was reproduced once and confirmed to pass on retry — not a regression from this work.
