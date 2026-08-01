import { MockView } from "../mocks/mock-all";

export interface FetchOptions {
  mock?: string;
}

const _get = async (url: string, options?: Omit<RequestInit, "method" | "body"> & FetchOptions) => {
  const { mock, ...fetchOptions } = options || {};

  try {
    const res = await fetch(url, { method: "GET", ...fetchOptions });
    if (res.ok) return res.json();
  } catch {
    // Network error — fall through to mock
  }

  if (mock) {
    const data = MockView[mock];
    if (data) return data;
  }

  throw new Error(`Request failed for: ${url}`);
};

const api = {
  get: _get,
};

export default api;
