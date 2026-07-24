# Entrypoint

Index of rule/doc files for this project. Any agent working on this repo only needs to start here.

- `/docs/rules/workflow.md` — feature workflow (spec > build > update spec/docs > review > cleanup), module rules (max 1000 lines, independent modules), commit, formatting, and naming conventions.
- `/docs/rules/bun.md` — Bun runtime/tooling conventions (use Bun instead of Node.js, testing, frontend).
- `/docs/documents/access-tokens.md` — Access Tokens module: entity/repository, create/list/delete/revoke services, secret hashing/rotation, the standalone unwired `ApiTokenGuard`, and the seed/permissions-repository cross-cutting edits it required.
- `/docs/documents/auth.md` — Auth module: register/verify-otp/login/refresh/logout/forgot-password/reset-password lifecycle, JWT cookies, the shared `common/` guards it depends on, and why hashing uses `bcryptjs` instead of `Bun.password`.
- `/docs/documents/permissions.md` — Permissions module: entity, repository, DTOs, services, endpoints (guarded by `JwtAuthGuard`+`PermissionsGuard`), `countReferences`' real `accessTokenCount`, known quirks.
- `/docs/documents/roles.md` — Roles module: entity, repository (Prisma-backed, wired into `AppModule`), DTOs, services (default-role/permission-slug rules), full CRUD routes guarded by `JwtAuthGuard`+`PermissionsGuard` (the old `req.user.roleSlug` placeholder is gone).
- `/docs/documents/users.md` — Users module: entity, repository, DTOs, services (level-hierarchy + super-admin-promotion rules on update/delete), endpoints, known gaps (no password hashing on this module's own routes, no roleId existence validation) — the admin-facing CRUD surface; see `auth.md` for the end-user register/login lifecycle.
