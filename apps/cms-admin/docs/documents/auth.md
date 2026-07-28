# Auth & Session

`src/context/AuthContext.tsx`, `src/context/HealthContext.tsx`, `src/components/ProtectedRoute.tsx`, `src/pages/auth/*` — client-side session state, mount-time silent refresh, API-health gating, and the login/register/invite-accept screens. Depends on the token-refresh logic in `lib/api.ts` (see [app-shell.md](./app-shell.md)).

## `AuthContext` (`src/context/AuthContext.tsx`)

State: `{ token, role, userId, displayName, permissions, loading }`, plus `login(accessToken)` / `logout()`. The access token itself is decoded client-side (`decodeToken` — naive `atob` on the JWT's payload segment, **not verified**, just read for `userId`/`role`/`exp`) to populate `role`/`userId` synchronously; `displayName`/`permissions` are fetched separately via `GET /auth/me` (`fetchPermissions`) so a slow or failed permissions fetch never blocks the token itself from being usable — sidebar permission gates just fall back to an empty permission set until the next successful fetch.

**Mount-time refresh** (`attemptMountRefresh`): there's no client-readable signal for "does a session exist" (the refresh token is an httpOnly cookie), so every mount does one silent `POST /auth/refresh`. A `401` is treated as a definitive "no session" and logs out immediately; any other failure (network error, 5xx, 429 — most commonly a cold-start backend) is retried with backoff delays `MOUNT_REFRESH_RETRY_DELAYS_MS = [2000, 5000, 10000]` before giving up, so a live session isn't discarded just because the server was briefly unreachable.

`onSessionExpired` (registered here, called from `lib/api.ts`'s response interceptor) clears token/state when a mid-session refresh fails — this is what actually logs a user out after a 401 that can't be recovered by the axios-level silent refresh.

## `HealthContext` (`src/context/HealthContext.tsx`)

Independent of auth — polls `GET {VITE_API_URL}/health` (no credentials) on an adaptive interval: 14 minutes while healthy, 10 seconds while unhealthy, 5s fetch timeout via `AbortController`. Pauses polling when the tab is hidden (`visibilitychange`) and re-pings immediately on becoming visible. Renders `ConnectionOverlay` (full-screen blocking spinner, "Connecting to service...") as a sibling to `children` whenever unhealthy — this is what covers a Render free-tier cold start (~30s) for the whole app, login screen included, hence why `HealthProvider` wraps `BrowserRouter` in `main.tsx` (see [app-shell.md](./app-shell.md)).

## `ProtectedRoute` (`src/components/ProtectedRoute.tsx`)

Used by `router.tsx` to gate everything under `/admin`. While `loading` (auth context still resolving its mount-time refresh), renders nothing. If no token: fetches `GET /auth/setup` (`{ adminExists: boolean }`, `enabled: !loading && !token`) to decide whether to redirect to `/login` or `/register` — first-run detection. If `minRole` is passed and the caller's role is below it (`roleLevel` comparison, see [app-shell.md](./app-shell.md)'s note on `lib/roles.ts`), redirects to `/403`. `AdminRoute` (role-only, no `minRole` param) is dead code — see [app-shell.md](./app-shell.md).

## Pages

- **`LoginPage`** (`/login`) — checks `GET /auth/setup` first; redirects to `/register` if no admin exists yet. `react-hook-form` with email/password/`rememberMe` (remember-me is collected but not read anywhere else in this file — presumably a refresh-token-lifetime hint the backend controls). On success, calls `AuthContext.login(accessToken)` and navigates to `/admin`.
- **`RegisterPage`** (`/register`) — same `auth-setup` query, but stays on the page and shows a "Set up admin account" vs. "Create guest account" heading depending on `adminExists` (first registrant becomes the admin per backend rules — this page doesn't choose the role, the API does). On success, invalidates the `auth-setup` query and navigates to `/login` (no auto-login — registration requires OTP verification server-side, not modeled in this frontend beyond the redirect).
- **`InviteAcceptPage`** (`/invite/:token`) — sets a password for a pre-created guest/invited account via `useAcceptInvite` (see [locales-and-invites.md](./locales-and-invites.md)). Client-side password-confirmation match check via `useWatch`.

## Known gaps

- The mount-time refresh retry delays and the "why" comment reference `specs/access-token-auth-mismatch.md` and a Render free-tier cold start — no such spec file exists in this repo at the time of writing; the comment predates this doc pass and should be reconciled the next time this file is touched (either the spec gets written, or the comment should stop citing it).
- `decodeToken` does not verify the JWT signature — this is fine for reading role/userId in the UI (the value is meaningless without a valid `Authorization` header, which `lib/api.ts` attaches server-side-verified), but it does mean any client-side logic keyed off `role`/`userId` before the first API round trip is trusting an unverified value.
