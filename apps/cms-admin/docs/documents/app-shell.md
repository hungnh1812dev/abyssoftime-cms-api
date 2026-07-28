# App Shell

Bootstrap, HTTP client, routing table, and shared types that every other module depends on. React 19 + TypeScript + Vite (not Bun's own `Bun.serve`/HTML-import bundler — see `docs/rules/bun.md`'s Frontend section, which doesn't apply to this app; Bun is used only as the package manager/script runner). Bundling is Vite, tests run on Vitest (`bun run test` → `vitest run`), not `bun test`.

## Bootstrap (`src/main.tsx`)

Provider nesting, outside-in: `QueryClientProvider` → `HealthProvider` → `BrowserRouter` → `AuthProvider` → `AppRouter`, with `Toaster` (sonner) and `ReactQueryDevtools` as siblings inside `QueryClientProvider`. `HealthProvider` wraps `BrowserRouter` (not the other way around) so `ConnectionOverlay` (see [auth.md](./auth.md)) can render over the whole app including the login screen.

`src/App.tsx` is the unmodified Vite/React template starter (counter button, Vite/React logos) — **dead code**, not imported anywhere in `main.tsx` or `router.tsx`. Same for `src/App.css` and the `assets/react.svg`/`assets/vite.svg`/`assets/hero.png` it pulls in.

## HTTP client (`src/lib/api.ts`)

Single `axios` instance (`api`), `withCredentials: true`, `baseURL` from `VITE_API_URL`. Auth model:

- Access token lives **in memory only** (`_accessToken` module-level variable, set via `setAccessToken`/read via `getAccessToken`) — never in `localStorage`/`sessionStorage`. Refresh token is an httpOnly cookie the frontend never touches directly.
- A request interceptor attaches `Authorization: Bearer <token>` from the in-memory token on every outgoing request.
- A response interceptor catches `401`s: on the first `401` for a given request (`!original._retried`), it calls `POST /auth/refresh` (deduped via a module-level `_refreshPromise` so concurrent `401`s trigger one refresh, not N), retries the original request once with the new token, and on refresh failure clears the token and invokes the `onSessionExpired` callback (registered by `AuthContext`, see [auth.md](./auth.md)) before rejecting.

This module has no React dependency — `AuthContext` is the only consumer of `setAccessToken`/`onSessionExpired`, everything else just imports `api`.

## Query client (`src/lib/queryClient.ts`)

One shared `QueryClient`: `staleTime: 30_000`, `retry: 1`. All `useQuery` hooks across the app inherit these defaults unless overridden locally (e.g. `useSingleTypeDocument`'s custom `retry` that stops on a `404`, see [documents.md](./documents.md)).

## Router (`src/router.tsx`)

`react-router-dom` v7, `<Routes>`/`<Route>` (not the data-router API). Public routes: `/login`, `/register`, `/invite/:token`, `/403`. Everything else nests under `/admin`, gated by `ProtectedRoute` (see [auth.md](./auth.md)) wrapping `AdminLayout` (see [navigation-shell.md](./navigation-shell.md)). Unmatched paths (`*`) redirect to `/admin`.

Every panel route below `/admin` except the `index` route (`AdminPage`) is `React.lazy`-loaded with a shared `PanelFallback` (`Loading…`) `Suspense` boundary — content-type, collection-type detail, and every settings page. `settings/media` has no `minRole`/permission gate at the route level (page-level empty state instead); `settings/users` requires `minRole="admin"`; `settings/access-tokens`, `settings/roles`, `settings/permissions`, `settings/internationalize` require `minRole="super_admin"`. These route-level `minRole` checks are a coarser, second layer on top of the Sidebar's per-permission `hasPermission()` gating (see [navigation-shell.md](./navigation-shell.md)) — a link can be hidden by permission while the route itself is still only gated by role.

`src/components/AdminRoute.tsx` (role-only guard, checks `role !== "admin"`) is **dead code** — not referenced from `router.tsx` or anywhere else; `ProtectedRoute`'s `minRole` prop fully replaced it.

## Shared types (`src/types/cms.ts`)

- `FieldDefinition` — one schema field: `name`, `type` (string, e.g. `"text"`/`"number"`/`"boolean"`/`"media"`/`"richtext"`/`"json"`/`"component"`), `ext` (allowed file extensions for `media`), `width` (`"100%" | "50%" | "1/3"`, form-grid column span), `repeatable` (component arrays), `header` (marks a field as the preferred label for collapsed/repeatable-entry summaries), `fields` (nested `FieldDefinition[]` for `type: "component"`).
- `ContentTypeSummary` / `ContentType` — `Kind: "single" | "collection"`; `ContentType` adds `Fields`, `listFields` (admin-configured list-view column override, see [documents.md](./documents.md)), timestamps.
- `Document` — `{ data: Record<string, unknown>; status: EntryStatus }`, `EntryStatus = "draft" | "modified" | "published"`.
- `SYSTEM_FIELDS` / `stripSystemFields` — the field-name allowlist (`id`, `documentId`, `locale`, `createdAt`, `updatedAt`, `createdBy`, `updatedBy`, `updatedByName`) stripped from a document's `data` before it's fed into a `react-hook-form` instance, so the form only ever sees user-editable schema fields.
- `Locale`, `MediaAsset` — mirror the API's locale/media-asset response shapes.

## Misc

- `src/lib/utils.ts` — `cn()` (`clsx` + `tailwind-merge`), used everywhere Tailwind classes are conditionally composed.
- `src/lib/pageSize.ts` — `PAGE_SIZE_OPTIONS = [10, 25, 50, 100]`, shared between the collection list page and its `PageSizeSelector` (see [documents.md](./documents.md)).
- `src/content-type-registry/index.ts` — see [content-type.md](./content-type.md).
