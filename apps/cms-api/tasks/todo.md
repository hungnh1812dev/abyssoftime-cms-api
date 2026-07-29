# Todo — `rememberMe` support in login

See `tasks/plan.md` for full context and rationale.

## Phase 1 — Foundation
- [x] Task 1 — `RefreshTokenPayload` gains `rememberMe`; `JwtTokenService` dual-TTL signing (7d/30d) + `getRefreshTokenMaxAgeMs` helper

## Phase 2 — Services
- [x] Task 2 — `LoginService.execute` threads `rememberMe`; `LoginResult` gains `refreshTokenMaxAgeMs`
- [x] Task 3 — `RefreshTokenService` re-applies `rememberMe` on rotation, `?? false` fallback for old tokens

## Phase 3 — Controller
- [x] Task 4 — `LoginDto` field + `AuthController` handler plumbing + dynamic cookie `maxAge`
- [x] **Checkpoint (core implementation):** `bun run lint` / `bun run test:cov` / `bun run build` green — automated checks pass; manual `start:dev` walkthrough still outstanding — commit

## Phase 4 — Docs
- [ ] Task 5 — `docs/documents/auth.md` updated (DTOs list, `RefreshTokenPayload`, TTL prose, endpoint table, `RefreshTokenService` note)
- [ ] **Checkpoint:** doc read-through against SPEC.md + shipped code — commit

## Phase 5 — Review + close-out
- [ ] Five-axis review (correctness / readability / architecture / security / performance)
- [ ] Address findings
- [ ] `SPEC.md` trimmed to a one-line pointer at `docs/documents/auth.md`
- [ ] **Checkpoint (final):** all checks green — commit
