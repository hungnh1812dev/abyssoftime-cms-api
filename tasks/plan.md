# Plan: Swagger/OpenAPI Documentation

See `SPEC.md` for the active spec — binding source of truth for scope/boundaries below.

## Context

No `@nestjs/swagger` dependency, bootstrap wiring, or controller/DTO decorators exist yet. This
plan adds all three: the dependency, `DocumentBuilder`/`SwaggerModule.setup('api-docs', ...)`
wiring in the bootstrap layer, and `@ApiTags`/`@ApiOperation`/`@ApiResponse`/`@ApiCookieAuth`
decorators across all 10 controllers plus `@ApiProperty`/`@ApiPropertyOptional` across all 19
DTOs. Purely additive/decorator-based — no runtime behavior change, confirmed by re-running the
full test suite unchanged at the end.

**Auth scheme correction** (resolved during Spec, not to be re-litigated during Build): the guarded
routes use `JwtAuthGuard` reading the `access_token` **httpOnly cookie** — Swagger scheme is
`addCookieAuth('access_token')` + `@ApiCookieAuth()` per guarded route/controller. `addBearerAuth()`
is registered in `DocumentBuilder` for visibility but **no route** gets `@ApiBearerAuth()` — the
only bearer-checking guard (`ApiTokenGuard`) isn't wired to any route in this repo yet.

Each module's real status codes/auth requirements were read directly from `docs/documents/*.md`'s
endpoint tables (not guessed) — the todo list below cites the exact codes per route.

Build order: bootstrap infra first (nothing else can be manually smoke-tested without it), then one
module at a time (DTOs + controller together, since a controller's `@ApiResponse` often references
its own request DTO), in ascending complexity: `permissions` → `roles` → `users` → `access-tokens`
→ `auth` → `media` → `content-type` → `document` (3 controllers, largest). Verify (build/lint/
test:cov) after each module, not just at the end, so a decorator typo is caught close to its
source. Final checkpoint: manual smoke-test of `/api-docs` in a browser.

## Confirmed decisions (from Spec phase)

1. Full annotation coverage now (all 10 controllers, all 19 DTOs), not a partial/pilot pass.
2. `/api-docs`, mounted unconditionally in all environments — no env-gating.
3. Title `"Abyssoftime CMS API"`, version sourced from `package.json` (`0.0.1`).
4. Cookie-auth scheme only attached to routes actually behind `JwtAuthGuard`; bearer scheme
   registered but unattached anywhere.
