# Entrypoint

Index of rule/doc files for this project. Any agent working on this repo only needs to start here.

- `/docs/rules/workflow.md` — feature workflow (spec > build > update spec/docs > cleanup), module rules (max 1000 lines, independent modules), commit, formatting, and naming conventions.
- `/docs/rules/bun.md` — Bun runtime/tooling conventions (use Bun instead of Node.js, testing, frontend).
- `/docs/documents/permissions.md` — Permissions module: entity, repository, DTOs, services, endpoints, known quirks.
- `/docs/documents/roles.md` — Roles module: entity, repository (Prisma-backed, wired into `AppModule`), DTOs, services (level/default-role/permission-slug rules), full CRUD routes, and the `req.user.roleSlug` auth placeholder that currently makes writes 403 until real auth lands.
- `/docs/documents/users.md` — Users module: entity, repository, DTOs, services, endpoints, known gaps (no password hashing, no roleId validation).
