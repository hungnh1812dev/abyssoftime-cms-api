# Spec

Active spec: `docs/specs/api-token-content-type-scoped-permissions.md` — let API access tokens scope document-action permissions (`document:read`/`create`/`update`/`delete`/`publish`/`unpublish`) to specific content types (e.g. only `document:read:cv-page`) instead of only "all content types", enforced on both REST (which requires first wiring the currently-unused `ApiTokenGuard` onto document routes) and GraphQL, plus the matching `cms-admin` token-creation UI.
