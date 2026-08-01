import { MockView } from "../mocks/mock-all";
import get from "lodash/get";

export interface ApiError extends Error {
  status?: number;
  info?: unknown;
}

export interface RestOptions {
  url: string;
  method?: "GET" | "POST" | "PUT" | "DELETE";
  body?: unknown;
  headers?: Record<string, string>;
  selectKey?: string;
  mock?: string;
  next?: { revalidate?: number | false; tags?: string[] };
  cache?: RequestCache;
}

const isDev = process.env.NEXT_ENV !== "production";

const restfulFetch = async <T>(options: RestOptions): Promise<T> => {
  const { url, method = "GET", body, headers, selectKey, mock, next, cache } = options;

  try {
    const res = await fetch(url, {
      method,
      signal: AbortSignal.timeout(50_000),
      ...(body !== undefined && {
        body: JSON.stringify(body),
        headers: { "Content-Type": "application/json", ...headers },
      }),
      ...(body === undefined && headers && { headers }),
      ...(next && { next }),
      ...(cache && { cache }),
    });

    if (res.ok) {
      const json: unknown = await res.json();
      const result = selectKey ? get(json, selectKey) : json;
      if (result != null && !(Array.isArray(result) && result.length === 0)) return result as T;
    } else {
      let info: unknown;
      try {
        info = await res.json();
      } catch {
        /* ignore parse failure */
      }
      const err = new Error(`HTTP ${res.status}: Request failed for ${url}`) as ApiError;
      err.status = res.status;
      if (info !== undefined) err.info = info;
      throw err;
    }
  } catch (err) {
    // if ((err as ApiError).status !== undefined) throw err;
    if (isDev && mock) {
      const data = MockView[mock];
      if (data !== undefined) return data as T;
    }
    throw err;
  }

  if (isDev && mock) {
    const data = MockView[mock];
    if (data !== undefined) return data as T;
  }

  throw new Error(`Request failed for: ${url}`);
};

const restfulApi = { fetch: restfulFetch };
export default restfulApi;
