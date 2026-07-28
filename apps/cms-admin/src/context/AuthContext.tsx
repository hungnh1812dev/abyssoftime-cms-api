import axios from "axios";
import { createContext, type ReactNode, useCallback, useContext, useEffect, useRef, useState } from "react";

import { api, onSessionExpired, setAccessToken } from "@/lib/api";

// Delays between mount-time refresh retries on a transient failure (network
// error, 5xx, 429) — not a definitive 401. Sized to ride out a Render
// free-tier cold start (~30s, see docs/guide.md).
// eslint-disable-next-line react-refresh/only-export-components
export const MOUNT_REFRESH_RETRY_DELAYS_MS = [2000, 5000, 10000];

function sleep(delayMs: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, delayMs));
}

interface JwtPayload {
  userId: string;
  role: string;
  exp: number;
}

function decodeToken(token: string): JwtPayload {
  const payload = token.split(".")[1];
  return JSON.parse(atob(payload)) as JwtPayload;
}

interface AuthState {
  token: string | null;
  role: string | null;
  userId: string | null;
  displayName: string | null;
  permissions: string[];
  loading: boolean;
}

interface AuthContextValue extends AuthState {
  login: (accessToken: string) => void;
  logout: () => void;
}

const LOGGED_OUT_STATE: AuthState = { token: null, role: null, userId: null, displayName: null, permissions: [], loading: false };

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    token: null,
    role: null,
    userId: null,
    displayName: null,
    permissions: [],
    loading: true,
  });

  const mountedRef = useRef(true);

  // Fetches the caller's own role+permissions+displayName from GET /auth/me
  // and merges them into state — split from login()/attemptMountRefresh() so
  // a slow or failed fetch never blocks the access token itself from being
  // usable (specs/access-token-auth-mismatch.md §13.6).
  const fetchPermissions = useCallback(async () => {
    try {
      const response = await api.get<{ role: string; permissions: string[]; displayName: string }>("/auth/me");
      if (!mountedRef.current) return;
      setState((previous) => (previous.token ? { ...previous, permissions: response.data.permissions, displayName: response.data.displayName } : previous));
    } catch {
      // Non-fatal — sidebar gating just falls back to an empty permission
      // set (and no display name) until the next successful fetch (next
      // login/refresh).
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;

    onSessionExpired(() => {
      if (mountedRef.current) {
        setAccessToken(null);
        setState(LOGGED_OUT_STATE);
      }
    });

    // No client-readable signal indicates whether a session exists — the
    // refresh token lives only in the HttpOnly cookie — so every mount
    // attempts one silent, cookie-only refresh. A 401 definitively means
    // "no session" and logs out immediately. Anything else (network error,
    // 5xx, 429) is a transient failure — most commonly a Render free-tier
    // cold start — and gets retried before giving up, so a live session
    // isn't discarded just because the server was briefly unreachable.
    async function attemptMountRefresh() {
      for (let attempt = 0; mountedRef.current; attempt++) {
        try {
          const response = await api.post<{ accessToken: string }>("/auth/refresh", undefined, {
            _retried: true,
            headers: { "Cache-Control": "no-cache, no-store" },
          } as object);
          if (!mountedRef.current) return;
          const { accessToken } = response.data;
          setAccessToken(accessToken);
          const { userId, role } = decodeToken(accessToken);
          setState({ token: accessToken, role, userId, displayName: null, permissions: [], loading: false });
          void fetchPermissions();
          return;
        } catch (error) {
          if (!mountedRef.current) return;

          const status = axios.isAxiosError(error) ? error.response?.status : undefined;
          const isDefinitiveNoSession = status === 401;
          const delayMs = MOUNT_REFRESH_RETRY_DELAYS_MS[attempt];

          if (isDefinitiveNoSession || delayMs === undefined) {
            setState(LOGGED_OUT_STATE);
            return;
          }

          await sleep(delayMs);
        }
      }
    }

    void attemptMountRefresh();

    return () => {
      mountedRef.current = false;
      onSessionExpired(null);
    };
  }, [fetchPermissions]);

  function login(accessToken: string) {
    const { userId, role } = decodeToken(accessToken);
    setAccessToken(accessToken);
    setState({ token: accessToken, role, userId, displayName: null, permissions: [], loading: false });
    void fetchPermissions();
  }

  const logout = useCallback(async () => {
    setAccessToken(null);
    setState(LOGGED_OUT_STATE);
    try {
      await api.post("/auth/logout");
    } catch {
      // cookie cleared server-side on best-effort basis
    }
  }, []);

  return <AuthContext.Provider value={{ ...state, login, logout }}>{children}</AuthContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider");
  return context;
}
