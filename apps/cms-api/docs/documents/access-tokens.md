# Access Tokens Module

`src/modules/access-tokens/**` — clean-architecture module for managing scoped, expiring API access tokens (create/list/delete/revoke), plus a standalone `ApiTokenGuard` (`src/common/guards/api-token.guard.ts`) that can authenticate `Authorization: Bearer <token>` requests. Fully wired: registered in `AppModule`, all four CRUD routes are HTTP-reachable, Prisma-backed, and guarded by real JWT + permission-slug authorization. `ApiTokenGuard` is built and unit-tested but **not** attached to any route yet — no consuming route exists in this repo, so it's provided/exported by `AccessTokenModule` for a future caller to `@UseGuards`.

## Deviation from the original ask

**Postgres-only, not all three schema files.** `prisma/mysql/schema.prisma` and `prisma/sqlite/schema.prisma` are still empty stubs (generator/datasource blocks only) — `Permission`/`Role`/`User` were never backfilled into them. `AccessToken.user User?` requires a `User` model in the same schema file, so adding `AccessToken` to mysql/sqlite would require also creating `Permission`/`Role`/`User` there, a much larger, unrelated change. Confirmed with the user; same deviation the previous (auth/permissions/roles) cycle made for the same reason.

## Entity

`domain/entities/access-token.entity.ts` — `AccessTokenEntity`:

| Field         | Type              |
| ------------- | ----------------- |
| `documentId`  | `string`          |
| `name`        | `string`          |
| `token`       | `string`           |
| `permissions` | `string[]`         |
| `expiresAt`   | `Date \| null`     |
| `createdAt`   | `Date`             |
| `updatedAt`   | `Date`             |
| `updatedBy`   | `string \| null`   |

`token` holds the **SHA-256 hash** of the secret, never the plaintext — see [Token lifecycle](#token-lifecycle-secrets-hashing-plaintext-exposure). Maps 1:1 to the `AccessToken` Prisma model (`prisma/postgresql/schema.prisma`); `permissions` is stored as raw `Json` in the DB but typed `string[]` in the domain layer, cast on read by `PrismaAccessTokenRepository`.

## Repository

`domain/repositories/access-token.repository.ts` — interface `IAccessTokenRepository`, DI token `ACCESS_TOKEN_REPOSITORY`:

- `findAll(): Promise<AccessTokenEntity[]>`
- `findById(documentId): Promise<AccessTokenEntity | null>`
- `findByTokenHash(hash): Promise<AccessTokenEntity | null>`
- `create(data: CreateAccessTokenData): Promise<AccessTokenEntity>`
- `update(documentId, data: UpdateAccessTokenData): Promise<AccessTokenEntity>`
- `delete(documentId): Promise<void>`

Unlike `IRoleRepository` (domain error classes translated in the Prisma layer), lookups here return `T | null` and 404s are raised in the service layer from an explicit pre-check — matching `IPermissionRepository`'s style. The Prisma repository (`infrastructure/persistence/prisma-access-token.repository.ts`, `PrismaAccessTokenRepository`) stays "dumb": no error translation, straight passthrough to `prisma.accessToken.*`.

## DTOs

`create-access-token.dto.ts`:

- `name` — `@IsString() @IsNotEmpty()`
- `permissions` — `@IsArray() @IsString({ each: true }) @ArrayUnique()`
- `expiresIn` — `@IsIn(["30m", "1h", "1d", "1m", "1y", "never"])`

`revoke-access-token.dto.ts` — same three fields, all `@IsOptional()` (provide only what you want to change; the secret rotates regardless of what's provided).

## Token lifecycle: secrets, hashing, plaintext exposure

`application/services/access-token-secret.util.ts`:

- `generateAccessTokenSecret()` — `cms_` + `randomBytes(32).toString("hex")` as the plaintext (68 chars total), SHA-256 hash persisted. Mirrors `ForgotPasswordService`'s reset-token generation pattern.
- `resolveExpiresAt(expiresIn, now?)` — maps the DTO enum to a `Date | null` (`never` → `null`).

The plaintext is returned **exactly once**, in the HTTP response body of `create` or `revoke`, and never again — `list` strips it entirely (see [Services](#services--business-rules)), and no log statement anywhere in the module touches the plaintext or the hash.

## Services & business rules

All services inject `@Inject(ACCESS_TOKEN_REPOSITORY)`; `Create`/`Revoke` additionally inject permissions' `PERMISSSION_REPOSITORY` to validate scope slugs (cross-module, via `AccessTokenModule` importing `PermissionModule`), via a shared `assertPermissionsExist(permissions, slugs)` helper (`application/services/assert-permissions-exist.util.ts`) — extracted after a five-axis code review flagged the identical logic being duplicated verbatim in both services.

**Create** (`execute(dto, callerId)`):

1. If `dto.permissions` is non-empty, every slug must exist in the permission catalog (same `findAll` + `Set` diff pattern as `CreateRoleService`) → `400 BadRequest` listing unknown slugs. Empty array skips the check.
2. Generates a secret, resolves `expiresAt`, persists with `updatedBy: callerId`.
3. Returns `{ entity, plaintext }` — the plaintext is only ever produced here and in Revoke, never re-derivable from the stored hash.

**List** — thin passthrough to `findAll()`.

**Delete** (`execute(documentId)`): `404` if not found, then a real hard `delete()` — no soft-delete column exists.

**Revoke** (`execute(documentId, dto, callerId)`):

1. `404` if `documentId` not found.
2. If `dto.permissions !== undefined`, validate against the catalog **before** touching the secret — a rejected validation must not rotate the token (dedicated test case; ordering is load-bearing, not incidental).
3. Generate a fresh secret/hash regardless of whether any other field changed.
4. `expiresAt` is recomputed only if `dto.expiresIn` was provided; otherwise the existing value is carried over untouched.
5. `name`/`permissions` fall back to the existing entity's values when omitted (`??`).
6. Persists via `update()` with the same `documentId` — `createdAt` and identity are preserved; only `token`, and optionally `name`/`permissions`/`expiresAt`, change.

Both `Create` and `Revoke` are the **first services in this repo** to read `req.user.sub` and pass it through as a real `updatedBy` — every other module (`roles`, `permissions`) still hardcodes `updatedBy: ""`. `JwtAuthGuard` runs before the controller method and always populates `req.user` on success (throws `401` otherwise), so `req.user.sub` is guaranteed non-null by the time a controller method reads it.

## Endpoints

`presentation/access-token.controller.ts`, `@Controller("/api/v1/access-tokens")`, `JwtAuthGuard` + `PermissionsGuard` on every route:

| Method   | Path                              | Service                    | Required permission  | Notes                                                                 |
| -------- | ---------------------------------- | --------------------------- | --------------------- | ---------------------------------------------------------------------- |
| `GET`    | `/api/v1/access-tokens`               | `ListAccessTokensService`   | `api_token:read`      | Response strips `token` entirely (explicit field mapping, not `delete`, since entity fields are `readonly`) |
| `POST`   | `/api/v1/access-tokens`               | `CreateAccessTokenService`  | `api_token:manager`   | Returns plaintext `token` once                                        |
| `POST`   | `/api/v1/access-tokens/:id/revoke`    | `RevokeAccessTokenService`  | `api_token:manager`   | Rotates the secret always; returns the new plaintext `token` once; `404` if not found |
| `DELETE` | `/api/v1/access-tokens/:id` (204)     | `DeleteAccessTokenService`  | `api_token:manager`   | Hard delete; `404` if not found                                       |

## ApiTokenGuard (standalone, unwired)

`src/common/guards/api-token.guard.ts` — `@Injectable() class ApiTokenGuard implements CanActivate`, constructor-injects `ACCESS_TOKEN_REPOSITORY` directly (no `JwtTokenService` dependency — this is a fully separate auth path from `JwtAuthGuard`):

1. Reads `Authorization: Bearer <token>` — `401` if header missing or doesn't start with `"Bearer "`, or the remainder is empty after trimming.
2. SHA-256-hashes the plaintext, looks up via `findByTokenHash(hash)` — `401` if not found.
3. `401` if `expiresAt` is non-null and `< Date.now()`. A `null` `expiresAt` (never-expires) always passes this check regardless of the current time.
4. On success, sets `request.apiToken = { documentId, name, permissions }` — a **distinct** property from `request.user`, so any future route/service can tell whether an action came from a real logged-in user vs. an access token.
5. Registered as a provider **and** export of `AccessTokenModule`, but never referenced inside any `@UseGuards(...)` call anywhere in the repo — confirmed by `rg "ApiTokenGuard" src --type ts -l` showing only the guard file, its spec, and the module registration. Wiring it into a real route is explicitly out of scope for this cycle.

`src/common/types/api-token-payload.ts` — new `ApiTokenPayload { documentId, name, permissions }`, named to avoid clashing with the pre-existing `AccessTokenPayload` (the unrelated JWT session payload in `jwt-payload.ts`). `AuthenticatedRequest` (`src/common/types/authenticated-request.ts`) gained one optional field: `apiToken?: ApiTokenPayload`.

## Module wiring

`access-token.module.ts` imports `PermissionModule` (for slug validation), registers the controller, all four services, and `ApiTokenGuard`, and binds `ACCESS_TOKEN_REPOSITORY → PrismaAccessTokenRepository`. Exports `ACCESS_TOKEN_REPOSITORY` and `ApiTokenGuard` (so a future consumer only needs `imports: [AccessTokenModule]`). Imported into `src/app.module.ts` between `UserModule` and `AuthModule`.

## Permissions catalog additions

`src/bootstrap/seed-default-data.service.ts` — two new slugs added to `DEFAULT_PERMISSIONS` (`api_token:manager`, `api_token:read`), granted to `super_admin` and `admin` respectively in `DEFAULT_ROLES`. Seeding is additive-only (`findBySlug` guard, skip if already present) — **existing dev/prod databases seeded before this change will not retroactively gain these permissions on an already-existing `super_admin`/`admin` role**; that requires a manual `PUT /api/v1/roles/:id` (or a fresh DB) to pick up the new defaults on a pre-existing install.

## Cross-cutting fix: real `accessTokenCount`

`src/modules/permissions/infrastructure/persistence/prisma-permission.repository.ts`'s `countReferences` previously hardcoded `accessTokenCount: 0` (see `docs/documents/permissions.md`, now updated). It now runs `prisma.accessToken.count({ where: { permissions: { array_contains: [slug] } } })` alongside the existing `role.count` query, in parallel via `Promise.all`. `DeletePermissionService` already consumed `accessTokenCount` correctly before this fix (`refs.roleCount > 0 || refs.accessTokenCount`) — this was a pure data-correctness fix, no consumer change needed. Verified live: deleting a permission referenced by a real access token now 409s with a real, non-zero count.

## Known quirks / deviations (preserved intentionally)

- `PrismaAccessTokenRepository`'s `update()` always passes every field to Prisma's `data:` object, including `undefined` for fields the caller didn't intend to touch — this matches `PrismaPermissionRepository`'s `update()` pattern (Prisma's client ignores `undefined` values in `data:`), not a bug.
- No soft-delete/`revokedAt` state — `delete` removes the row, `revoke` rotates the existing row's secret in place; a third state was explicitly ruled out per the spec's "Never" boundary.
- `access-token.repository.ts`'s `findByTokenHash`/`findById` return `T | null` — different style from `roles`' domain-error-class approach, matching `permissions`' style instead (a deliberate per-repository choice, not inconsistency to fix).
- `countReferences`'s `accessToken.count`/`role.count` JSONB `array_contains` queries have no supporting index — flagged by review as a pre-existing-pattern tradeoff (same gap the `role.count` query already had), acceptable at this repo's expected scale (admin-managed roles/tokens, not thousands). A `@@index([permissions], type: Gin)` would be the fix if volume ever grows.
- `RevokeAccessTokenService`/`DeleteAccessTokenService` do a check-then-act (`findById` then `update`/`delete`) with no optimistic-locking or transaction wrapping — a race between two concurrent calls on the same token could last-write-wins. Acceptable for an admin-only, low-concurrency management surface; flagged by review as a known, undefended edge case rather than a bug.

## Tests

Unit tests (Jest, mocked repositories via `Test.createTestingModule` + `useValue`) live next to each source file: `create-access-token.service.spec.ts`, `list-access-token.service.spec.ts`, `delete-access-token.service.spec.ts`, `revoke-access-token.service.spec.ts` (404, empty-body rotation, partial-field merge, unknown-slug rejection with no rotation), `assert-permissions-exist.util.spec.ts` (empty-slug-list skip, all-valid pass, unknown-slug rejection), `access-token.controller.spec.ts` (delegation + response-shape assertions, mocked `JwtTokenService` to instantiate `JwtAuthGuard`), `prisma-access-token.repository.spec.ts` (mocked `PrismaService`), `access-token.module.spec.ts` (wiring). `api-token.guard.spec.ts` covers all 6 branches directly via construction (no `Test.createTestingModule`, matching `jwt-auth.guard.spec.ts`'s convention): missing header, malformed header, unknown hash, expired token, valid token, never-expiring token.

Per project rule, no `coverageThreshold` entries were added for the Prisma repository or the controller.

## Verified state (2026-07-24)

`bun run build`, `bun run lint`, and `bun run test:cov` all pass (59 suites, 284 tests). Live end-to-end walkthrough performed manually (test user created and cleaned up afterward): login → create → list (no `token` field) → revoke with empty body (secret rotates, identity/fields preserved) → delete (204, then 404 on re-delete) → permission-delete now 409s with a real `accessTokenCount`. A five-axis code review (`agent-skills:code-reviewer`) approved the feature with no Critical/Important findings; the one actionable suggestion (duplicated `assertPermissionsExist` logic) was extracted into a shared helper, the rest (missing GIN index, check-then-act race on revoke/delete) are documented above as accepted tradeoffs.
