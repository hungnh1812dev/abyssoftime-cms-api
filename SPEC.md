# Spec

## Feature: Users module — lock down create/update, add role-assignment endpoint

### Context

Public self-registration (`auth` module: `register` → `resend-otp` → `verify-otp`) already correctly
implements "first-ever verifier becomes `super_admin`, everyone else becomes `guest`"
(`verify-otp.service.ts`) — no change needed there. The admin-facing `users` module
(`POST`/`PUT /api/users`) currently lets a caller set `accountType`/`verified`/`roleId` directly and
lets `email`/`username` be changed on update. This cycle locks that down to match the intended
business rules below.

### Confirmed decisions

1. **`POST /api/users` (create) stays**, but its DTO drops `accountType`, `verified`, `roleId`. Only
   `email`, `name`, `username`, `password` remain. The service always writes fixed values:
   `accountType: false` (placeholder — reserved for a future Google/Facebook OAuth account-type
   flag, not implemented yet, "update later"), `verified: false`, `roleId: null`. The created user
   becomes usable the same way a self-registered one does: `POST /auth/resend-otp` with their email
   (already works for any unverified user regardless of how the record was created — no change
   needed there) → `POST /auth/verify-otp` (existing first-verifier-wins logic applies here too, so
   an admin-created account can still become `super_admin` if it's the first to ever verify).
2. **`email`/`username` become permanently immutable** — identifiers used for lookup, unique, never
   editable after creation, by anyone (admin included). Dropped from `UpdateUserDto` entirely; drop
   the corresponding uniqueness-on-update checks in `UpdateUserService`.
3. **`PUT /api/users/:id` (update)** DTO shrinks to `name`/`password` only (both optional); drops
   `accountType`/`verified`/`roleId` (fixed/internal — `verified` only ever flips via the self-serve
   OTP-verify flow; `accountType` is reserved/unused; `roleId` moves to decision 4). Callable by: the
   caller updating their own record, OR anyone holding `user:manager` updating someone else's. Removes
   the existing role-level-hierarchy / super-admin-promotion checks from `UpdateUserService` — those
   existed only to gate `roleId` changes, which no longer happen on this route.
4. **New endpoint** for changing a user's role after creation: `PATCH /api/users/:id/role`,
   `{ roleId: string }`, gated by a new permission slug `user:role_manager` (kept separate from
   `user:manager`/`role:manager` so it's independently grantable). Seeded to `super_admin` only,
   matching the existing pattern where every other `*:manager` slug is `super_admin`-only and `admin`
   only ever gets `*:read`.

### Out of scope / deferred

- OAuth-based `accountType` values (Google/Facebook) — future work; stays a fixed `false` placeholder.
- Requiring the current password to change your own password — not raised; left as current behavior
  (no old-password check on this module's routes, same as today).

See `/docs/documents/users.md` for the implemented state once this lands.
