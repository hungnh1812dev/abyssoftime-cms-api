# Locales & Invites

`src/pages/admin/settings/InternationalizePage.tsx`, `src/components/locale/LocaleSelector.tsx`, `src/hooks/{useLocales,useLocalesMutations}.ts`, `src/hooks/useInvites.ts`, `src/pages/auth/InviteAcceptPage.tsx` — the locale catalog (used everywhere content is edited, see [content-type.md](./content-type.md) and [documents.md](./documents.md)) and the invite-a-user flow (surfaced inside [access-control.md](./access-control.md)'s `UsersPage`, not its own settings page).

## Locales

- **`useLocales`** (`hooks/useLocales.ts`) — `GET /api/locales`, the single read query every locale-aware screen (`LocaleSelector`, `ContentTypePanel`, `CollectionListPage`) depends on.
- **`useLocalesMutations`** (`hooks/useLocalesMutations.ts`) — create/update/delete over `/api/locales/:code`, all invalidating the one `["locales"]` query key.
- **`LocaleSelector`** (`components/locale/LocaleSelector.tsx`) — resolves an empty/unset `value` to the default locale (`isDefault: true`, falling back to the first locale) rather than leaving the select blank; renders nothing (`null`) if the locale list is empty (e.g. still loading) instead of showing a disabled/loading state.
- **`InternationalizePage`** (`/admin/settings/internationalize`, `minRole="super_admin"`) — CRUD table over locales. Locale `code` is immutable after creation (2–5 lowercase chars, pattern-validated client-side, e.g. `en`/`vi`/`zh-cn`); delete is disabled in the UI once only one locale remains (`locales.length <= 1`) so the catalog can't be emptied from this screen.

## Invites (`hooks/useInvites.ts`)

Three hooks: `useInviteList` (`GET /api/invites`), `useCreateInvite`/`useRevokeInvite` (`POST`/`DELETE /api/invites`), and `useAcceptInvite` (`POST /auth/invite/:token` — note the `/auth/` prefix, not `/api/invites/` — this is an unauthenticated auth-flow endpoint, not a settings-CRUD one). No dedicated `InvitesPage`; the create/list/revoke UI is embedded directly in [access-control.md](./access-control.md)'s `UsersPage` (invite dialog + "Pending Invites" table below the user list), and invite **acceptance** is [auth.md](./auth.md)'s `InviteAcceptPage` at the public `/invite/:token` route. A freshly-created invite's link (`{origin}/invite/{token}`) is shown once in the creation dialog with a copy button, mirroring the access-token creation UX (see [access-control.md](./access-control.md)).
