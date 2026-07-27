# Spec: Swagger/OpenAPI Documentation

## Objective

Add generated Swagger/OpenAPI documentation for the whole API. Every existing HTTP endpoint (10 controllers, 19 DTOs, across `access-tokens`, `auth`, `content-type`, `document` (collection/single/public), `media`, `permissions`, `roles`, `users`) gets a Swagger UI entry with correct tags, operation summaries, request/response shapes, and auth requirements. This is also what makes the workflow rule added to `docs/rules/workflow.md` step 5 ("if the feature adds a new endpoint, also update the Swagger doc") actually actionable — until this ships, there's no Swagger doc to update.

Target users: engineers integrating against this API (internal frontend, future third-party API-token consumers) and this repo's own contributors, who from now on must keep the generated doc in sync with new endpoints as a normal part of the feature workflow.

## Auth reality check (corrects an earlier wrong assumption)

Two independent auth mechanisms exist in this codebase — the Swagger security schemes must match both, not just one:

- **`JwtAuthGuard`** (`src/common/guards/jwt-auth.guard.ts`) — reads the `access_token` **httpOnly cookie**, not an `Authorization` header. This guards nearly every non-public route (`users`, `roles`, `permissions`, `access-tokens`, `media`, `document` non-public routes; `content-type` is read-only/no guard per `content-type.md`). Swagger scheme: `DocumentBuilder.addCookieAuth('access_token')`.
- **`ApiTokenGuard`** (`src/common/guards/api-token.guard.ts`) — reads `Authorization: Bearer <token>`, checked against `AccessToken` records. Built and unit-tested but **not wired to any route** (confirmed in `docs/documents/access-tokens.md`). Register the bearer scheme in `DocumentBuilder` (`addBearerAuth()`) so it's available/visible for future use, but do **not** attach `@ApiBearerAuth()` to any current controller/route — no route actually requires it yet, and documenting one as bearer-gated would misrepresent the real guard in effect.

Public (unauthenticated) routes — all of `auth` (`register`/`verify-otp`/`resend-otp`/`has-users`/`login`/`refresh`/`logout`/`forgot-password`/`reset-password`), and `document`'s `public-document.controller.ts` routes — get no `@ApiCookieAuth()`/security requirement at all.

## Core features / acceptance criteria

1. **Dependency**: add `@nestjs/swagger` (version compatible with the installed `@nestjs/common@^11.1.28`/`@nestjs/core@^11.1.28`).
2. **Bootstrap wiring** (`src/bootstrap/configure-app.ts` or a new sibling file if it would push `configure-app.ts` toward unreadability — follow the "module file max 500 lines" spirit even though this is a bootstrap file, not a module):
   - `DocumentBuilder` with title `"Abyssoftime CMS API"`, a one-paragraph description, version read from `package.json` (`0.0.1`), `addCookieAuth('access_token')`, `addBearerAuth()`.
   - `SwaggerModule.setup('api-docs', app, document)` — mounted unconditionally (all environments, per confirmed answer), no env-gating.
3. **Every controller** gets `@ApiTags(<module-name>)` at the class level, and per-route `@ApiOperation({ summary })` + `@ApiResponse(...)` for every status code the route can actually produce (cross-reference each module's `docs/documents/*.md` endpoint table for the real status codes — e.g. `access-tokens`' `404`/`400` (unknown permission slug), `auth`'s `401`/`403`/`409`, `permissions`'/`roles`' `409` on delete-with-references, etc.). Apply `@ApiCookieAuth()` (no argument — matches the scheme name registered in step 2) to every class/route actually behind `JwtAuthGuard`; none get `@ApiBearerAuth()` per the auth-reality-check above.
4. **Every DTO** (all 19, under each module's `application/dto/` or `presentation/dto/`) gets `@ApiProperty()`/`@ApiPropertyOptional()` per field, matching the existing `class-validator` decorators' semantics (required vs. `@IsOptional`), with `example` values that are realistic but never real secrets (no real passwords/tokens/OTPs — placeholder values only, e.g. `"SecurePass123!"`, not anything resembling a production credential).
5. Response DTOs/shapes: where a controller currently returns a plain object literal (not a class), add a thin response-shape class decorated with `@ApiProperty()` so Swagger can render it, without changing the actual runtime response shape (documentation-only addition, zero behavior change).
6. **`content-type` module read-only routes**: still get full annotation (tags/operations) even though there's no write route (per `content-type.md`, "no write route" is intentional — don't add one, just document what exists).
7. `bun run build`, `bun run lint`, `bun run test:cov` all pass after the change. No existing test's assertions on response body shape may change (this is additive/decorator-only — Nest's Swagger decorators don't alter runtime behavior unless a DTO field is added, which this spec forbids).

## Boundaries

- **Always do**: keep this purely additive/decorator-based — no change to actual request/response runtime shape, no new fields on real response bodies, no change to guard behavior or route paths.
- **Always do**: cross-check each module's `docs/documents/*.md` file for the real status codes / auth requirements before annotating that module's controller — don't guess.
- **Ask first about**: any DTO where adding `@ApiProperty({ example })` would require inventing a plausible-looking secret/credential value — confirm the placeholder is clearly fake, not skip the question.
- **Never do**: attach `@ApiBearerAuth()` to any route (none are actually bearer-gated yet — see auth reality check). Never expose real secret values (hashed or plaintext) as Swagger examples. Never add `coverageThreshold` entries for controller files touched here, per existing project rule.

## Out of scope

- Wiring `ApiTokenGuard` to any route (unrelated, separate future feature).
- Gating `/api-docs` behind an env flag (explicitly declined — available in all environments).
- Any change to actual endpoint behavior, validation rules, or response payloads.
