# Todo — Access Token Feature (CRUD + standalone ApiTokenGuard)

See `tasks/plan.md` for full context and rationale.

## Phase 0 — Schema + migration (ASK FIRST GATE)
- [x] Confirm with user before touching schema (postgres-only deviation, already discussed)
- [x] `prisma/postgresql/schema.prisma` — add `AccessToken` model (after `Role`, before `User`)
- [x] `prisma/postgresql/schema.prisma` — add `User.updatedAccessTokens` back-relation
- [x] `bun run prisma:migrate` — new migration `add_access_tokens`
- [x] `bun run prisma:generate`
- [x] **Checkpoint 0:** `bun run build` clean

## Phase 1 — Domain layer
- [x] `src/modules/access-tokens/domain/entities/access-token.entity.ts`
- [x] `src/modules/access-tokens/domain/repositories/access-token.repository.ts` (`IAccessTokenRepository`, `ACCESS_TOKEN_REPOSITORY`)
- [x] **Checkpoint 1:** `bunx tsc --noEmit` clean

## Phase 2 — Prisma repository
- [x] `src/modules/access-tokens/infrastructure/persistence/prisma-access-token.repository.ts`
- [x] `prisma-access-token.repository.spec.ts` (found/not-found `findByTokenHash`, `permissions` JSON round-trip)
- [x] **Checkpoint 2:** file-scoped tests green, `tsc --noEmit` clean

## Phase 3 — Create flow
- [x] `application/dto/create-access-token.dto.ts`
- [x] `application/services/access-token-secret.util.ts` (`generateAccessTokenSecret`, `resolveExpiresAt`)
- [x] `application/services/create-access-token.service.ts` (+ `.spec.ts`)
- [x] `presentation/access-token.controller.ts` — `POST /api/access-tokens` (`api_token:manager`, first `req.user.sub` consumer)
- [x] **Checkpoint 3:** `bun run build && bun run lint && bun run test:cov` (module) green; manual `curl` create returns `token` once (deferred — module not yet wired into app.module.ts, no route to hit until Phase 7)

## Phase 4 — List flow
- [x] `application/services/list-access-token.service.ts` (+ `.spec.ts`)
- [x] Controller — `GET /api/access-tokens` (`api_token:read`), response strips `token` field
- [x] **Checkpoint 4:** test proves response objects have no `token` key

## Phase 5 — Delete flow
- [x] `application/services/delete-access-token.service.ts` (+ `.spec.ts`)
- [x] Controller — `DELETE /api/access-tokens/:id` → 204 (`api_token:manager`)
- [x] **Checkpoint 5:** 404-on-missing / 404-on-redelete tests; manual DB check confirms hard delete (deferred — no live route until Phase 7 wiring; repo's `delete()` uses Prisma's hard `delete`, no soft-delete column exists)

## Phase 6 — Revoke flow
- [x] `application/dto/revoke-access-token.dto.ts`
- [x] `application/services/revoke-access-token.service.ts` (+ `.spec.ts`)
- [x] Controller — `POST /api/access-tokens/:id/revoke`
- [x] **Checkpoint 6:** tests cover rotate-with-empty-body, partial-field merge, unknown-slug rejection (no rotation on rejected validation); full `test:cov` on `access-tokens` tree

## Phase 7 — Module + app wiring
- [x] `access-token.module.ts` (+ `.spec.ts`) — `ApiTokenGuard` deliberately omitted from providers/exports until Phase 8 builds it
- [x] Register `AccessTokenModule` in `src/app.module.ts`
- [x] **Checkpoint 7:** full build/lint/test:cov; app boots without DI errors, all 4 routes mapped (note: `GET` end-to-end manual check blocked until Phase 9 seeds permissions)

## Phase 8 — `ApiTokenGuard` (standalone, unwired)
- [x] `src/common/types/api-token-payload.ts`
- [x] `src/common/types/authenticated-request.ts` — add `apiToken?: ApiTokenPayload`
- [x] `src/common/guards/api-token.guard.ts` (+ `.spec.ts`: missing/malformed/unknown/expired/valid/never-expires)
- [x] `access-token.module.ts` — registered `ApiTokenGuard` as provider/export (deferred from Phase 7 since the guard didn't exist yet)
- [x] **Checkpoint 8:** build/lint/test:cov gate; `rg "ApiTokenGuard" src --type ts -l` shows no `@UseGuards` usage

## Phase 9 — Seed + cross-cutting edits (ASK FIRST GATE, two sub-confirmations)
- [x] Confirm before editing `seed-default-data.service.ts`
- [x] `seed-default-data.service.ts` — add `api_token:manager`/`api_token:read` to `DEFAULT_PERMISSIONS`; grant to `super_admin`/`admin` in `DEFAULT_ROLES`
- [x] Confirm before editing `prisma-permission.repository.ts`
- [x] `prisma-permission.repository.ts` — real `accessTokenCount` in `countReferences`
- [x] Update `prisma-permission.repository.spec.ts` for the new branch
- [x] **Checkpoint 9:** full-suite `test:cov` (281 tests) green; seed idempotency verified across two boots (seeded once, no-op/no errors on rerun); manual `DELETE /api/permissions/:id` 409 walkthrough deferred to Phase 10's end-to-end checkpoint (409 branch already covered by `DeletePermissionService` unit tests)

## Phase 10 — Final full-stack checkpoint
- [x] `bun run format` — clean diff
- [x] `bun run lint` — zero errors (pre-existing unrelated warning in `main.ts`)
- [x] `bun run build` — succeeds
- [x] `bun run test:cov` — full suite green (58 suites, 281 tests)
- [x] Manual end-to-end (live curl against a fresh test user promoted to `super_admin`, cleaned up afterward): login → create → list (no `token` field) → revoke via empty body (secret rotates, same `documentId`, fields preserved) → delete (204, then 404 on re-delete) → bonus: deleting a permission referenced by a live access token now 409s with a real, non-zero `accessTokenCount`
- [x] Grep sanity: `cms_` only in util/tests; `ApiTokenGuard` never in `@UseGuards`; `accessTokenCount: 0` gone from production code (only in test fixtures)
- [x] **Checkpoint 10 (final):** every `SPEC.md` success-criteria item verified true

## Phase 11 — Docs closeout + review (added retroactively; not in the original plan)
- [x] Add `docs/documents/access-tokens.md`
- [x] Update `docs/documents/permissions.md` (remove stale "`accessTokenCount` hardcoded `0`" notes)
- [x] Update `docs/ENTRYPOINT.md` index
- [x] Fold `SPEC.md` into docs, reset `SPEC.md` for next cycle
- [x] Five-axis code review (`agent-skills:code-reviewer`) — APPROVE, no Critical/Important findings; extracted duplicated `assertPermissionsExist` into a shared helper (with its own spec), documented the two accepted tradeoffs (missing GIN index, check-then-act race) in `access-tokens.md`
- [x] **Checkpoint 11 (final):** workflow's Spec → Build → Update spec/docs → Review → Clean up cycle fully closed
