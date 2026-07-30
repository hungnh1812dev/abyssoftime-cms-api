import axios from "axios";

export const api = axios.create({
  baseURL: `${import.meta.env.VITE_API_URL || ""}/api/v1`,
  withCredentials: true,
});

let _onSessionExpired: (() => void) | null = null;

export function onSessionExpired(callback: (() => void) | null) {
  _onSessionExpired = callback;
}

// Track in-flight refresh to avoid concurrent duplicate calls
let _refreshPromise: Promise<void> | null = null;

async function refreshSession(): Promise<void> {
  if (_refreshPromise) return _refreshPromise;

  _refreshPromise = api
    .post("/auth/refresh", undefined, { _retried: true } as object)
    .then(() => undefined)
    .finally(() => {
      _refreshPromise = null;
    });

  return _refreshPromise;
}

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;

    if (error.response?.status === 401 && !original._retried) {
      original._retried = true;
      try {
        await refreshSession();
        return api(original);
      } catch {
        _onSessionExpired?.();
        return Promise.reject(error);
      }
    }

    return Promise.reject(error);
  },
);
