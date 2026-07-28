import axios from "axios";

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "",
  withCredentials: true,
});

// Access token — in-memory only; populated by auth context
let _accessToken: string | null = null;

export function setAccessToken(token: string | null) {
  _accessToken = token;
}

export function getAccessToken(): string | null {
  return _accessToken;
}

let _onSessionExpired: (() => void) | null = null;

export function onSessionExpired(callback: (() => void) | null) {
  _onSessionExpired = callback;
}

api.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Track in-flight refresh to avoid concurrent duplicate calls
let _refreshPromise: Promise<string> | null = null;

async function refreshAccessToken(): Promise<string> {
  if (_refreshPromise) return _refreshPromise;

  _refreshPromise = api
    .post<{ accessToken: string }>("/auth/refresh", undefined, { _retried: true } as object)
    .then((res) => {
      const { accessToken } = res.data;
      setAccessToken(accessToken);
      return accessToken;
    })
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
        const newToken = await refreshAccessToken();
        original.headers.Authorization = `Bearer ${newToken}`;
        return api(original);
      } catch {
        setAccessToken(null);
        _onSessionExpired?.();
        return Promise.reject(error);
      }
    }

    return Promise.reject(error);
  },
);
