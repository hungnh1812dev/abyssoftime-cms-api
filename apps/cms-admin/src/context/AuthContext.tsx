import axios from "axios";
import { createContext, type ReactNode, useCallback, useContext, useEffect, useRef, useState } from "react";

import { api, onSessionExpired } from "@/lib/api";
import type { RoleItem } from "@/hooks/useRoles";

// Delays between mount-time session retries on a transient failure (network
// error, 5xx, 429) — not a definitive 401. Sized to ride out a cold-start
// backend.
// eslint-disable-next-line react-refresh/only-export-components
export const MOUNT_REFRESH_RETRY_DELAYS_MS = [2000, 5000, 10000];

function sleep(delayMs: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, delayMs));
}

export interface MeUser {
  documentId: string;
  email: string;
  name: string;
  username: string;
  accountType: boolean;
  verified: boolean;
  roleId: string | null;
  role: RoleItem | null;
  createdAt: string;
  updatedAt: string;
}

interface AuthState {
  user: MeUser | null;
  loading: boolean;
}

interface AuthContextValue {
  user: MeUser | null;
  role: RoleItem | null;
  userId: string | null;
  displayName: string | null;
  permissions: string[];
  loading: boolean;
  login: () => Promise<void>;
  logout: () => Promise<void>;
}

const LOGGED_OUT_STATE: AuthState = { user: null, loading: false };

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ user: null, loading: true });
  const mountedRef = useRef(true);

  const fetchMe = useCallback(async () => {
    const response = await api.get<MeUser>("/auth/me");
    return response.data;
  }, []);

  useEffect(() => {
    mountedRef.current = true;

    onSessionExpired(() => {
      if (mountedRef.current) setState(LOGGED_OUT_STATE);
    });

    // No client-readable signal indicates whether a session exists — both
    // tokens live only in HttpOnly cookies — so every mount attempts a
    // silent, cookie-only refresh followed by GET /auth/me to hydrate
    // identity/role/permissions. A 401 from either call definitively means
    // "no session" and logs out immediately. Anything else (network error,
    // 5xx, 429) is a transient failure — most commonly a cold-start backend —
    // and gets retried before giving up, so a live session isn't discarded
    // just because the server was briefly unreachable.
    async function attemptMountSession() {
      for (let attempt = 0; mountedRef.current; attempt++) {
        try {
          await api.post("/auth/refresh", undefined, {
            _retried: true,
            headers: { "Cache-Control": "no-cache, no-store" },
          } as object);
          const user = await fetchMe();
          if (!mountedRef.current) return;
          setState({ user, loading: false });
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

    void attemptMountSession();

    return () => {
      mountedRef.current = false;
      onSessionExpired(null);
    };
  }, [fetchMe]);

  // Called after a successful POST /auth/login — the login response carries
  // no token/user data (cookies only), so identity is hydrated with one
  // follow-up GET /auth/me call.
  const login = useCallback(async () => {
    const user = await fetchMe();
    setState({ user, loading: false });
  }, [fetchMe]);

  const logout = useCallback(async () => {
    setState(LOGGED_OUT_STATE);
    try {
      await api.post("/auth/logout");
    } catch {
      // cookies cleared server-side on a best-effort basis
    }
  }, []);

  const value: AuthContextValue = {
    user: state.user,
    role: state.user?.role ?? null,
    userId: state.user?.documentId ?? null,
    displayName: state.user?.name ?? null,
    permissions: state.user?.role?.permissions ?? [],
    loading: state.loading,
    login,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider");
  return context;
}
