# Backend Feature Request: `GET /api/v1/auth/me`

**From:** CMS-Admin frontend team
**To:** `abyssoftime-cms-api` backend team
**Status:** Requested — frontend is shipping a temporary workaround (see below) until this lands.

## Problem

The API is cookie-session-based: `access_token`/`refresh_token` are `httpOnly` cookies, unreadable by
JavaScript by design. Login, refresh, and logout all return only `{ message: string }` — no token, no user
data — in the response body.

That's correct for the auth cookies themselves, but it leaves the frontend with **no way to answer "who is
currently logged in, and what can they do?"** after a login or on a page reload. There is currently no
endpoint that resolves the session cookie back into a user identity.

## Current workaround (and why it's not good enough long-term)

The admin frontend is working around this gap by:
1. Keeping the just-entered email in memory after a successful `POST /auth/login`.
2. Calling `GET /api/v1/users` and matching the response array by that email to get `documentId` / `roleId`.
3. Calling `GET /api/v1/roles` to resolve that `roleId` into a permission list for UI gating.

This works, but has real problems:
- **Breaks on cold reload.** If the browser is refreshed (or the tab reopened) with only the session cookie
  present, there is no email in memory to match against — identity cannot be re-derived without asking the
  user to log in again.
- **Requires the wrong permissions.** Steps 2–3 require the *current* user to hold `user:read` and
  `role:read`, just to find out who they are. A low-privilege user without those permissions gets `403`s and
  silently degrades to "no permissions" in the UI, even though they're validly logged in.
- **Over-fetches.** `GET /users` returns every user in the system (unpaginated) just to find one row — an
  unnecessary privacy and performance cost that scales with the size of the user table.
- **Extra round trips.** Two additional requests (`/users`, `/roles`) are needed after every login and on
  every app-mount, just to answer a question a single endpoint should answer directly.

## Requested endpoint

```
GET /api/v1/auth/me
```

- **Auth:** session cookie only (`JwtAuthGuard`, same as any other authenticated route) — **no permission
  requirement**. Any user with a valid session should be able to ask "who am I," regardless of what
  `resource:action` permissions they hold.
- **Success (`200`):**
  ```json
  {
    "documentId": "…",
    "email": "user@example.com",
    "name": "Jane Doe",
    "username": "janedoe",
    "accountType": false,
    "verified": true,
    "roleId": "…",
    "role": {
      "documentId": "…",
      "name": "Editor",
      "slug": "editor",
      "level": 20,
      "permissions": ["document:read", "document:update"]
    },
    "createdAt": "…",
    "updatedAt": "…"
  }
  ```
  i.e. `UserResponseDto` plus the caller's resolved `role` (including its `permissions` array), so the
  frontend gets identity + authorization in one call. If the user has no role assigned, `role` can be `null`.
- **Error (`401`):** no valid `access_token` cookie — same meaning as any other guarded route: session
  expired/missing, frontend should redirect to `/login`.

## Why this shape

- Matches the existing `UserResponseDto` fields so the frontend doesn't need a second parallel user model.
- Embedding the resolved `role` (with `permissions`) avoids a second `GET /roles` call — this endpoint is
  meant to be the *one* call the frontend makes on login and on app-mount.
- No permission gate on the route itself, because "what am I allowed to do" is exactly the question this
  endpoint exists to answer — gating it behind a permission would be circular.

## Priority

Not a hard blocker — the frontend has a working stopgap — but requested as a near-term follow-up, since the
stopgap has real correctness gaps (cold-reload identity loss, wrong-permission 403s) that only a proper
`/auth/me` endpoint resolves cleanly.
