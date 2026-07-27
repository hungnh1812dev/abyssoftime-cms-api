# Spec

No active spec. The previous cycle (Users module — locking down `POST`/`PUT /api/users` to fixed
internal `accountType`/`verified`/`roleId` and immutable `email`/`username`, plus a new
`PATCH /api/users/:id/role` role-assignment endpoint gated by a dedicated `user:role_manager`
permission) is implemented, live-verified, and documented in `/docs/documents/users.md` — see that
file for module details, not here (per `/docs/rules/workflow.md`'s "Root docs" rule).
