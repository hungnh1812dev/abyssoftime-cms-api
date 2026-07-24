# Plan: Access Token Feature (CRUD + standalone ApiTokenGuard)

See `SPEC.md` for the full approved spec. This plan implements it.

## Context

`SPEC.md` asks for a new `access-tokens` module: CRUD management of scoped, expiring API tokens (create/list/delete/revoke), guarded the same way `roles`/`permissions` are, plus a standalone `ApiTokenGuard` that can authenticate `Authorization: Bearer <token>` requests — built now but not wired into any route yet. This is the next feature cycle after the seeding/auth/permission-slug work (already shipped, documented in `docs/documents/{auth,roles,permissions,users}.md`).

Codebase research surfaced one fact that forces a deviation from the spec's literal wording, and design gaps the spec left implicit that need a concrete resolution before code is written.

## Deviation from spec (confirmed with user)

**Schema scope: postgres-only, not "all three schema files."** `prisma/mysql/schema.prisma` and `prisma/sqlite/schema.prisma` are still empty stubs (generator/datasource blocks only) — `Permission`/`Role`/`User` were never backfilled into them, only `prisma/postgresql/schema.prisma` has real models. `AccessToken.user User? @relation(...)` requires a `User` model in the same schema file, so adding `AccessToken` to mysql/sqlite would require also creating `Permission`/`Role`/`User` there — a much bigger, unrelated change that violates `docs/rules/workflow.md`'s "minimize coupling on existing modules" rule. This is the same deviation the prior spec cycle made for the same reason. **User confirmed: postgres-only.**

## Resolved design decisions (not spelled out in SPEC.md)

1. **Payload naming collision.** `src/common/types/jwt-payload.ts` already exports `AccessTokenPayload` (the JWT session payload — unrelated to our new `AccessToken` Prisma model). New guard payload type is named `ApiTokenPayload` (`src/common/types/api-token-payload.ts`) to avoid any clash:
   ```ts
   export interface ApiTokenPayload {
     documentId: string;
     name: string;
     permissions: string[];
   }
   ```
   `AuthenticatedRequest` gains one optional field: `apiToken?: ApiTokenPayload`.

2. **`ApiTokenGuard` DI/testability.** Confirmed via `jwt-auth.guard.spec.ts`: this repo's convention is direct construction in tests (`new JwtAuthGuard(mockTokenService)`), not `Test.createTestingModule`. `ApiTokenGuard` follows the same shape — plain `@Injectable()` class, constructor-injects `ACCESS_TOKEN_REPOSITORY`, unit-tested via direct construction with a mocked repository and a fake `ExecutionContext`. It's registered as a provider/export of `AccessTokenModule` (not global) — fine, since the spec confirms it's unwired in this change; any future consumer just needs `imports: [AccessTokenModule]`.

3. **Small addition beyond the spec's file list:** `src/modules/access-tokens/application/services/access-token-secret.util.ts` — a tiny pure-function helper (`generateAccessTokenSecret()`, `resolveExpiresAt()`) shared by Create and Revoke to avoid duplicating token-gen/expiry-math logic. Flagged explicitly since it's not in `SPEC.md`'s file list.

4. **Repository error handling.** Unlike `IRoleRepository` (domain error classes + catch-in-service), `IAccessTokenRepository.findById`/`findByTokenHash` return `T | null` (matching `IPermissionRepository`'s cleaner style). 404s are raised in the service layer from an explicit pre-check; the Prisma repository itself stays "dumb" — no error translation.

## Patterns being reused (verified against actual source, not guessed)

- **Entity/repository shape** — `role.entiry.ts` / `role.repository.ts` (plain class, `IXRepository` interface + `Symbol` DI token).
- **Unknown-slug validation** — `CreateRoleService.assertPermissionsExist` (findAll + Set diff), copied verbatim for `AccessToken.permissions`:
  ```ts
  private async assertPermissionsExist(permissionSlugs: string[]): Promise<void> {
    if (permissionSlugs.length === 0) return;
    const catalog = await this.permissions.findAll();
    const validSlugs = new Set(catalog.map((p) => p.slug));
    const invalidSlugs = permissionSlugs.filter((slug) => !validSlugs.has(slug));
    if (invalidSlugs.length > 0) throw new BadRequestException(`Unknown permission slug(s): ${invalidSlugs.join(", ")}`);
  }
  ```
- **Token generation** — `ForgotPasswordService`'s `randomBytes(32).toString("hex")` + `createHash("sha256")` pattern, extended with the `cms_` prefix.
- **Guards/decorators** — `@UseGuards(JwtAuthGuard, PermissionsGuard)` + `@RequirePermissions("slug")`, exactly as in `role.controller.ts`. This new controller is the **first** in the repo to read `req.user.sub` (existing controllers hardcode `updatedBy: ""` and never touch `req.user`) — new precedent, called out per spec's decision table.
- **Module wiring** — `role.module.ts` (imports `PermissionModule` for cross-module slug validation, binds DI token to Prisma impl, exports the token).
- **Seeding** — `seed-default-data.service.ts`'s `DEFAULT_PERMISSIONS`/`DEFAULT_ROLES` arrays, idempotent via `findBySlug` guard.
- **`countReferences` stub** — `prisma-permission.repository.ts` hardcodes `accessTokenCount: 0`; `DeletePermissionService` already consumes it correctly (`refs.roleCount > 0 || refs.accessTokenCount`), so wiring the real count is a pure data-correctness fix, no consumer change needed.
- **No `coverageThreshold`** — removed entirely from `package.json` in the most recent commit (`747761f`). Plan writes solid spec coverage but adds zero `coverageThreshold` config entries anywhere.

## Dependency Graph

```
Phase 0 (ASK FIRST): schema + migration (postgres only)
  → Phase 1: domain layer (entity + repository interface, no DB)
    → Phase 2: PrismaAccessTokenRepository
      → Phase 3: Create slice (dto+service+controller route+shared secret util)
      → Phase 4: List slice
      → Phase 5: Delete slice
      → Phase 6: Revoke slice (reuses Phase 3's secret util)
        → Phase 7: AccessTokenModule wiring + app.module.ts registration
          → Phase 8: ApiTokenGuard (only needs Phase 2's findByTokenHash; can run parallel to 3-6)
            → Phase 9 (ASK FIRST): seed-default-data.service.ts + prisma-permission.repository.ts edits
              → Phase 10: full-stack checkpoint
```

## Task List

### Phase 0: Schema + migration (ASK FIRST GATE)

**Task 0.1** — Confirm with user before touching schema. Restate: postgres-only, mysql/sqlite untouched (documented deviation above).

**Task 0.2** — Add to `prisma/postgresql/schema.prisma`, positioned after `Role`, before `User` (since `User` needs to reference it):
```prisma
model AccessToken {
    id          Int       @default(autoincrement())
    documentId  String    @id @unique @default(uuid()) @map("document_id")
    name        String
    token       String    @unique
    permissions Json
    expiresAt   DateTime? @map("expires_at")
    createdAt   DateTime  @default(now()) @map("created_at")
    updatedAt   DateTime  @updatedAt @map("updated_at")
    user        User?     @relation("AccessTokenUpdatedBy", fields: [updatedBy], references: [documentId])
    updatedBy   String?   @map("updated_by")
    @@map("access_tokens")
}
```
Add to `User` (next to `updatedRoles`/`updatedPermissions`): `updatedAccessTokens AccessToken[] @relation("AccessTokenUpdatedBy") @ignore`.

**Task 0.3** — `bun run prisma:migrate` → new migration dir `prisma/postgresql/migrations/<YYYYMMDDHHMMSS>_add_access_tokens/migration.sql`. Must include `CREATE TABLE "access_tokens"`, unique constraints on `document_id`/`token`, FK: `ALTER TABLE "access_tokens" ADD CONSTRAINT "access_tokens_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "users"("document_id") ON DELETE SET NULL ON UPDATE CASCADE`.

**Task 0.4** — `bun run prisma:generate` (client gains `prisma.accessToken.*`).

**Acceptance:** `bun run build` succeeds even though nothing references `AccessToken` yet (proves schema/client change alone doesn't break compilation). `git diff prisma/postgresql/schema.prisma` shows only the new model + one added `User` line.

**Checkpoint 0:** `bun run build` clean.

### Phase 1: Domain layer

**Task 1.1** — `src/modules/access-tokens/domain/entities/access-token.entity.ts`:
```ts
export class AccessTokenEntity {
  constructor(
    public readonly documentId: string,
    public readonly name: string,
    public readonly token: string, // hash, never plaintext
    public readonly permissions: string[],
    public readonly expiresAt: Date | null,
    public readonly createdAt: Date,
    public readonly updatedAt: Date,
    public readonly updatedBy: string | null,
  ) {}
}
```

**Task 1.2** — `src/modules/access-tokens/domain/repositories/access-token.repository.ts`:
```ts
export interface CreateAccessTokenData {
  name: string;
  token: string;
  permissions: string[];
  expiresAt: Date | null;
  updatedBy: string | null;
}
export interface UpdateAccessTokenData {
  name?: string;
  token?: string;
  permissions?: string[];
  expiresAt?: Date | null;
  updatedBy: string | null;
}
export interface IAccessTokenRepository {
  findAll(): Promise<AccessTokenEntity[]>;
  findById(documentId: string): Promise<AccessTokenEntity | null>;
  findByTokenHash(hash: string): Promise<AccessTokenEntity | null>;
  create(data: CreateAccessTokenData): Promise<AccessTokenEntity>;
  update(documentId: string, data: UpdateAccessTokenData): Promise<AccessTokenEntity>;
  delete(documentId: string): Promise<void>;
}
export const ACCESS_TOKEN_REPOSITORY = Symbol("ACCESS_TOKEN_REPOSITORY");
```

**Acceptance:** compiles standalone (`tsc --noEmit`), no Prisma/Nest dependency. No `.spec.ts` needed (interfaces aren't tested directly, same as `role.repository.ts`).

**Checkpoint 1:** `bunx tsc --noEmit` clean.

### Phase 2: Prisma repository

**Task 2.1** — `src/modules/access-tokens/infrastructure/persistence/prisma-access-token.repository.ts`, mirroring `prisma-permission.repository.ts`'s `| null` style:
```ts
@Injectable()
export class PrismaAccessTokenRepository implements IAccessTokenRepository {
  constructor(private readonly prisma: PrismaService) {}
  async findAll(): Promise<AccessTokenEntity[]> { ... }
  async findById(documentId: string): Promise<AccessTokenEntity | null> { ... }
  async findByTokenHash(hash: string): Promise<AccessTokenEntity | null> {
    const row = await this.prisma.accessToken.findUnique({ where: { token: hash } });
    return row ? this.toEntity(row) : null;
  }
  async create(data: CreateAccessTokenData): Promise<AccessTokenEntity> { ... }
  async update(documentId: string, data: UpdateAccessTokenData): Promise<AccessTokenEntity> { ... }
  async delete(documentId: string): Promise<void> { await this.prisma.accessToken.delete({ where: { documentId } }); }
  private toEntity(row): AccessTokenEntity { return new AccessTokenEntity(row.documentId, row.name, row.token, row.permissions as string[], row.expiresAt, row.createdAt, row.updatedAt, row.updatedBy); }
}
```

**Task 2.2** — `prisma-access-token.repository.spec.ts` mocking `PrismaService` (check `prisma-role.repository.spec.ts` for the exact mocking convention): `findByTokenHash` found/not-found; `create` round-trips `permissions: string[]` through `Json` correctly.

**Acceptance:** `findByTokenHash("nonexistent")` resolves `null`, doesn't throw. Round-trip test passes.

**Checkpoint 2:** file-scoped tests green, `tsc --noEmit` clean.

### Phase 3: Create flow (vertical slice)

**Task 3.1** — `create-access-token.dto.ts`:
```ts
export class CreateAccessTokenDto {
  @IsString() @IsNotEmpty() name!: string;
  @IsArray() @IsString({ each: true }) @ArrayUnique() permissions!: string[];
  @IsIn(["30m", "1h", "1d", "1m", "1y", "never"]) expiresIn!: "30m" | "1h" | "1d" | "1m" | "1y" | "never";
}
```

**Task 3.2** — `access-token-secret.util.ts` (new file, flagged deviation from spec's literal file list — avoids duplicating logic between Create and Revoke):
```ts
export function generateAccessTokenSecret(): { plaintext: string; hash: string } {
  const plaintext = `cms_${randomBytes(32).toString("hex")}`;
  const hash = createHash("sha256").update(plaintext).digest("hex");
  return { plaintext, hash };
}
export function resolveExpiresAt(expiresIn: ExpiresIn, now: Date = new Date()): Date | null {
  if (expiresIn === "never") return null;
  const ms = { "30m": 30 * 60_000, "1h": 60 * 60_000, "1d": 24 * 60 * 60_000, "1m": 30 * 24 * 60 * 60_000, "1y": 365 * 24 * 60 * 60_000 }[expiresIn];
  return new Date(now.getTime() + ms);
}
```

**Task 3.3** — `create-access-token.service.ts`, mirrors `CreateRoleService`'s permission-validation pattern, injects both `ACCESS_TOKEN_REPOSITORY` and `PERMISSSION_REPOSITORY`:
```ts
async execute(dto: CreateAccessTokenDto, callerId: string | null): Promise<{ entity: AccessTokenEntity; plaintext: string }> {
  await this.assertPermissionsExist(dto.permissions);
  const { plaintext, hash } = generateAccessTokenSecret();
  const expiresAt = resolveExpiresAt(dto.expiresIn);
  const entity = await this.accessTokens.create({ name: dto.name, token: hash, permissions: dto.permissions, expiresAt, updatedBy: callerId });
  return { entity, plaintext };
}
```

**Task 3.4** — Controller skeleton + `POST /api/access-tokens`:
```ts
@Controller("/api/access-tokens")
export class AccessTokenController {
  constructor(private readonly createAccessTokenService: CreateAccessTokenService /* + others added later phases */) {}

  @Post()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions("api_token:manager")
  async create(@Body() dto: CreateAccessTokenDto, @Req() req: AuthenticatedRequest) {
    const { entity, plaintext } = await this.createAccessTokenService.execute(dto, req.user.sub);
    return { documentId: entity.documentId, name: entity.name, permissions: entity.permissions, expiresAt: entity.expiresAt, token: plaintext, createdAt: entity.createdAt, updatedAt: entity.updatedAt };
  }
}
```
First controller in the repo to read `req.user.sub` — new precedent per spec's decision table.

**Acceptance:** service spec covers: unknown-slug → `BadRequestException`; `token` passed to `create()` is a 64-hex-char hash, not the `cms_...` plaintext; returned `plaintext` starts with `cms_`, 68 chars total; `expiresIn: "never"` → `expiresAt: null`; `expiresIn: "1h"` → `~now + 3600000ms`.

**Checkpoint 3:** `bun run build && bun run lint && bun run test:cov` (module subtree) green.

### Phase 4: List flow

**Task 4.1** — `list-access-token.service.ts`: `execute(): Promise<AccessTokenEntity[]>`, thin passthrough to `findAll()`.

**Task 4.2** — Controller `GET /api/access-tokens`, `@RequirePermissions("api_token:read")` — response must **strip `token`** via an explicit mapping step (not `delete entity.token`, since entity fields are `readonly`): `{ documentId, name, permissions, expiresAt, createdAt, updatedAt, updatedBy }[]`.

**Acceptance:** response objects have no `token` key at all (test asserts `Object.keys` or `!("token" in item)`, not just `undefined`).

**Checkpoint 4:** build/lint/test:cov gate.

### Phase 5: Delete flow

**Task 5.1** — `delete-access-token.service.ts`:
```ts
async execute(documentId: string): Promise<void> {
  const existing = await this.accessTokens.findById(documentId);
  if (!existing) throw new NotFoundException(`Access token "${documentId}" not found`);
  await this.accessTokens.delete(documentId);
}
```

**Task 5.2** — Controller `DELETE /api/access-tokens/:id` → `204`, `@RequirePermissions("api_token:manager")`, `@HttpCode(HttpStatus.NO_CONTENT)`.

**Acceptance:** 404 on missing; happy path calls `delete()` exactly once; re-delete of same id → 404 (no soft-delete column exists to check — hard delete confirmed by its absence).

**Checkpoint 5:** build/lint/test:cov gate.

### Phase 6: Revoke flow

**Task 6.1** — `revoke-access-token.dto.ts` (all optional):
```ts
export class RevokeAccessTokenDto {
  @IsOptional() @IsString() @IsNotEmpty() name?: string;
  @IsOptional() @IsArray() @IsString({ each: true }) @ArrayUnique() permissions?: string[];
  @IsOptional() @IsIn(["30m", "1h", "1d", "1m", "1y", "never"]) expiresIn?: "30m" | "1h" | "1d" | "1m" | "1y" | "never";
}
```

**Task 6.2** — `revoke-access-token.service.ts`:
```ts
async execute(documentId: string, dto: RevokeAccessTokenDto, callerId: string | null): Promise<{ entity: AccessTokenEntity; plaintext: string }> {
  const existing = await this.accessTokens.findById(documentId);
  if (!existing) throw new NotFoundException(`Access token "${documentId}" not found`);
  if (dto.permissions !== undefined) await this.assertPermissionsExist(dto.permissions);

  const { plaintext, hash } = generateAccessTokenSecret();
  const expiresAt = dto.expiresIn !== undefined ? resolveExpiresAt(dto.expiresIn) : existing.expiresAt;

  const entity = await this.accessTokens.update(documentId, {
    name: dto.name ?? existing.name,
    token: hash,
    permissions: dto.permissions ?? existing.permissions,
    expiresAt,
    updatedBy: callerId,
  });
  return { entity, plaintext };
}
```
Validation happens *before* secret rotation — an unknown-slug rejection must not rotate the secret.

**Task 6.3** — Controller `POST /api/access-tokens/:id/revoke`, `@RequirePermissions("api_token:manager")`, same response shape as create.

**Acceptance:** 404 when missing; secret rotates even with `dto: {}` (new hash differs from `existing.token`, plaintext fresh each call); `expiresIn` omitted → `expiresAt` unchanged from `existing`; unknown-slug in `permissions` → `BadRequestException` AND `accessTokens.update` never called; `name`/`permissions` omitted → preserved from `existing`.

**Checkpoint 6:** build/lint/test:cov gate. This closes out the full CRUD service layer — run `test:cov` on the whole `access-tokens` tree.

### Phase 7: Module + app wiring

**Task 7.1** — `access-token.module.ts`:
```ts
@Module({
  imports: [PermissionModule],
  controllers: [AccessTokenController],
  providers: [
    ListAccessTokensService,
    CreateAccessTokenService,
    RevokeAccessTokenService,
    DeleteAccessTokenService,
    ApiTokenGuard,
    { provide: ACCESS_TOKEN_REPOSITORY, useClass: PrismaAccessTokenRepository },
  ],
  exports: [ACCESS_TOKEN_REPOSITORY, ApiTokenGuard],
})
export class AccessTokenModule {}
```
(`ApiTokenGuard` is built in Phase 8 — sequence so both land together, or stub Phase 8's guard file minimally first.)

**Task 7.2** — `access-token.module.spec.ts`, mirroring `role.module.spec.ts`'s metadata-reflection assertions.

**Task 7.3** — Register `AccessTokenModule` in `src/app.module.ts`'s `imports` array.

**Acceptance:** module metadata test passes; app boots (`bun run start:dev` or build+smoke run) without DI resolution errors — proves `PermissionModule` import correctly satisfies the slug-validation dependency. Note: `GET /api/access-tokens` manual check is blocked until Phase 9 seeds the permission slugs — not a Phase 7 bug.

**Checkpoint 7:** full `bun run build && bun run lint && bun run test:cov`.

### Phase 8: `ApiTokenGuard` (standalone, unwired)

**Task 8.1** — `src/common/types/api-token-payload.ts` per resolved design decision above.

**Task 8.2** — Edit `src/common/types/authenticated-request.ts`: add `apiToken?: ApiTokenPayload`.

**Task 8.3** — `src/common/guards/api-token.guard.ts`:
```ts
@Injectable()
export class ApiTokenGuard implements CanActivate {
  constructor(@Inject(ACCESS_TOKEN_REPOSITORY) private readonly accessTokens: IAccessTokenRepository) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const header = request.headers.authorization;
    if (typeof header !== "string" || !header.startsWith("Bearer ")) {
      throw new UnauthorizedException("Missing bearer token");
    }
    const plaintext = header.slice("Bearer ".length).trim();
    if (plaintext.length === 0) throw new UnauthorizedException("Missing bearer token");

    const hash = createHash("sha256").update(plaintext).digest("hex");
    const record = await this.accessTokens.findByTokenHash(hash);
    if (!record) throw new UnauthorizedException("Invalid access token");

    if (record.expiresAt && record.expiresAt.getTime() < Date.now()) {
      throw new UnauthorizedException("Access token expired");
    }

    request.apiToken = { documentId: record.documentId, name: record.name, permissions: record.permissions };
    return true;
  }
}
```

**Task 8.4** — `api-token.guard.spec.ts`, direct-construction pattern per `jwt-auth.guard.spec.ts`, covering: missing header; malformed header (no `Bearer ` prefix); unknown hash; expired token; valid non-expired token (`request.apiToken` set correctly); never-expiring token (`expiresAt: null`) passes regardless of `Date.now()`.

**Acceptance:** all 6 branches pass. Grep confirms `ApiTokenGuard` never appears inside a `@UseGuards(...)` call anywhere in the repo.

**Checkpoint 8:** build/lint/test:cov gate + `rg "ApiTokenGuard" src --type ts -l` shows only guard file + spec + module provider registration.

### Phase 9: Seed + cross-cutting edits (ASK FIRST GATE, two sub-confirmations)

**Task 9.1 (ASK FIRST)** — Confirm before editing `seed-default-data.service.ts`:
```diff
  const DEFAULT_PERMISSIONS: Omit<CreatePermissionData, "updatedBy">[] = [
    ...
    { slug: "permission:read", name: "Read permissions", description: "View permissions" },
+   { slug: "api_token:manager", name: "Manage access tokens", description: "Create, revoke, and delete access tokens" },
+   { slug: "api_token:read", name: "Read access tokens", description: "View access tokens" },
  ];

  const DEFAULT_ROLES: Omit<CreateRoleData, "updatedBy">[] = [
-   { name: "Super Admin", slug: "super_admin", permissions: ["user:manager", "role:manager", "permission:manager"], level: 100, isDefault: true },
+   { name: "Super Admin", slug: "super_admin", permissions: ["user:manager", "role:manager", "permission:manager", "api_token:manager"], level: 100, isDefault: true },
-   { name: "Admin", slug: "admin", permissions: ["user:read", "role:read", "permission:read"], level: 50, isDefault: true },
+   { name: "Admin", slug: "admin", permissions: ["user:read", "role:read", "permission:read", "api_token:read"], level: 50, isDefault: true },
    ...
  ];
```
Slug regex check: `api_token:manager` / `api_token:read` both match `^[a-z][a-z0-9_]*:[a-z][a-z0-9_]*$` — confirmed clean.

**Task 9.2 (ASK FIRST)** — Confirm before editing `prisma-permission.repository.ts`:
```diff
  async countReferences(slug: string): Promise<PermissionReferenceCount> {
-   const [roleCount] = await Promise.all([this.prisma.role.count({ where: { permissions: { array_contains: [slug] } } })]);
-   return { roleCount, accessTokenCount: 0 };
+   const [roleCount, accessTokenCount] = await Promise.all([
+     this.prisma.role.count({ where: { permissions: { array_contains: [slug] } } }),
+     this.prisma.accessToken.count({ where: { permissions: { array_contains: [slug] } } }),
+   ]);
+   return { roleCount, accessTokenCount };
  }
```
Architecture note: this creates a one-directional reverse dependency (`permissions` module's Prisma repository reaches into the `access_tokens` table), same pattern the repo already uses for `Role`'s table — no `AccessTokenModule` import needed since Prisma client access doesn't go through Nest DI/module boundaries. Update `prisma-permission.repository.spec.ts` to assert the combined `{ roleCount, accessTokenCount }` result.

**Acceptance:** seed idempotency — two consecutive app boots log the new slugs only once, no unique-constraint error on the second. `roles` table for `super_admin`/`admin` contains the new slugs after seed. `prisma-permission.repository.spec.ts` updated and passing. Manual: `DELETE /api/permissions/:id` on a permission referenced by a live access token → 409 with a real (non-zero) `accessTokenCount`.

**Checkpoint 9:** full-suite `bun run test:cov` (not just the new module — these are shared pre-existing files).

### Phase 10: Final full-stack checkpoint

**Task 10.1** — `bun run format` — clean diff, no unformatted new files.
**Task 10.2** — `bun run lint` — zero errors.
**Task 10.3** — `bun run build` — succeeds.
**Task 10.4** — `bun run test:cov` — full suite green.
**Task 10.5** — Manual end-to-end: login (existing flow) → `POST /api/access-tokens` → capture `token` → `GET /api/access-tokens` (no hash field) → `POST /api/access-tokens/:id/revoke {}` (new token, same `documentId`) → `DELETE /api/access-tokens/:id` (204, then 404) → DB spot-check (hash-only storage throughout, hard delete confirmed).
**Task 10.6** — Grep sanity: `rg "cms_" src` → only util/tests; `rg "ApiTokenGuard" src -l` → no controller `@UseGuards` wiring; `rg "accessTokenCount: 0" src` → zero matches.

**Checkpoint 10 (final):** all of the above pass; every `SPEC.md` Success Criteria item verified true.

## Risks and Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Schema/migration touches a shared, "ask first" file | Med | Explicit confirmation gate, Task 0.1, before any edit. |
| `seed-default-data.service.ts` / `prisma-permission.repository.ts` are shared files outside the new module | Med | Explicit confirmation gate, Tasks 9.1/9.2; full-suite regression run at Checkpoint 9, not just the new module's tests. |
| First controller to read `req.user.sub` — new precedent, no existing reference implementation to copy exactly | Low | Documented explicitly in this plan and in code; small, isolated surface (one controller). |
| Revoke rotating the secret before validating new `permissions` could leak a rotated-but-rejected state | Low | Validation runs before `generateAccessTokenSecret()`/`update()` in `RevokeAccessTokenService` — enforced by task ordering and a dedicated test case. |

## Verification (end-to-end, ties to SPEC.md's Success Criteria)

1. `POST /api/access-tokens` (as `api_token:manager`) → row created, plaintext `token` returned once; subsequent `GET` never shows it.
2. `POST /api/access-tokens/:id/revoke` with no body → secret rotates, `name`/`permissions`/`expiresAt`/`createdAt`/`documentId` unchanged, new plaintext returned; old plaintext no longer authenticates via `ApiTokenGuard`. With a body → also updates given fields.
3. `DELETE /api/access-tokens/:id` → row gone; re-delete → 404.
4. Deleting a `Permission` still referenced by a live `AccessToken` → 409 with real `accessTokenCount` (no longer hardcoded `0`).
5. `ApiTokenGuard`, unit-tested directly: valid hash → populates `request.apiToken`; expired/unknown → 401.
6. `bun run build`, `bunx tsc --noEmit`, `bunx eslint`, `bun run test:cov` all pass.

## Commit cadence

Per project convention: batch commits at checkpoint boundaries (end of each phase above), not per file. Ask for explicit Yes/No confirmation (staged files + full message) before each commit; no `Co-Authored-By`. Phases 0 and 9 are additionally gated on explicit user confirmation *before* editing, per `SPEC.md`'s "ask first" boundaries.
