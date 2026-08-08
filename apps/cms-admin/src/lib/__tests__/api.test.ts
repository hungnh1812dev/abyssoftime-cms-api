import MockAdapter from "axios-mock-adapter";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { api, onSessionExpired, setAccessToken } from "@/lib/api";

let mock: MockAdapter;

beforeEach(() => {
  mock = new MockAdapter(api);
  onSessionExpired(null);
  setAccessToken(null);
});

afterEach(() => {
  mock.restore();
  setAccessToken(null);
});

describe("api baseURL", () => {
  it("includes the /api/v1 prefix and withCredentials", () => {
    expect(api.defaults.baseURL).toMatch(/\/api\/v1$/);
    expect(api.defaults.withCredentials).toBe(true);
  });

  it("merges baseURL + request path to a single /api/v1 segment", async () => {
    let capturedFullUrl: string | undefined;

    mock.onAny().reply((config) => {
      const base = (config.baseURL ?? "").replace(/\/$/, "");
      const path = (config.url ?? "").replace(/^\//, "");
      capturedFullUrl = `${base}/${path}`;
      return [201, {}];
    });

    await api.post("/auth/register", { email: "a@b.com", password: "12345678" });
    expect(capturedFullUrl).toMatch(/\/api\/v1\/auth\/register$/);
  });
});

describe("api 401 response interceptor", () => {
  it("calls POST /auth/refresh with no body and retries the original request once on 401", async () => {
    let callCount = 0;
    let refreshRequestBody: unknown;

    mock.onPost("/auth/refresh").reply((config) => {
      refreshRequestBody = config.data;
      return [200, { message: "Refresh successful" }];
    });
    mock.onGet("/protected").reply(() => {
      callCount++;
      if (callCount === 1) return [401, { message: "Unauthorized" }];
      return [200, { data: "secret" }];
    });

    const response = await api.get("/protected");
    expect(response.status).toBe(200);
    expect(response.data).toEqual({ data: "secret" });
    expect(callCount).toBe(2);
    expect(refreshRequestBody).toBeUndefined();
  });

  it("dedupes concurrent refresh calls into a single POST /auth/refresh", async () => {
    let refreshCallCount = 0;

    mock.onPost("/auth/refresh").reply(() => {
      refreshCallCount++;
      return [200, { message: "Refresh successful" }];
    });
    let protectedCallCount = 0;
    mock.onGet("/protected").reply(() => {
      protectedCallCount++;
      if (protectedCallCount <= 2) return [401, { message: "Unauthorized" }];
      return [200, { data: "secret" }];
    });

    await Promise.all([api.get("/protected"), api.get("/protected")]);
    expect(refreshCallCount).toBe(1);
  });

  it("does not retry more than once (prevents infinite loop)", async () => {
    let refreshCallCount = 0;

    mock.onPost("/auth/refresh").reply(() => {
      refreshCallCount++;
      return [200, { message: "Refresh successful" }];
    });
    mock.onGet("/protected").reply(401, { message: "Unauthorized" });

    await expect(api.get("/protected")).rejects.toMatchObject({ response: { status: 401 } });
    expect(refreshCallCount).toBe(1);
  });

  it("calls onSessionExpired and rejects with the original 401 when refresh itself fails", async () => {
    let expiredCalled = false;
    onSessionExpired(() => {
      expiredCalled = true;
    });

    mock.onPost("/auth/refresh").reply(401, { message: "Refresh token expired" });
    mock.onGet("/protected").reply(401, { message: "Unauthorized" });

    await expect(api.get("/protected")).rejects.toMatchObject({ response: { status: 401 } });
    expect(expiredCalled).toBe(true);
  });
});

describe("access token request interceptor", () => {
  it("attaches Authorization: Bearer <token> on a request when a token is held", async () => {
    setAccessToken("held-token");
    let capturedAuthHeader: unknown;
    mock.onGet("/protected").reply((config) => {
      capturedAuthHeader = config.headers?.Authorization;
      return [200, {}];
    });

    await api.get("/protected");
    expect(capturedAuthHeader).toBe("Bearer held-token");
  });

  it("sends no Authorization header when no token is held", async () => {
    let capturedAuthHeader: unknown;
    mock.onGet("/protected").reply((config) => {
      capturedAuthHeader = config.headers?.Authorization;
      return [200, {}];
    });

    await api.get("/protected");
    expect(capturedAuthHeader).toBeUndefined();
  });
});

describe("access token capture on refresh", () => {
  it("captures accessToken from the /auth/refresh response and uses it on the retried request, not the stale one", async () => {
    let protectedCallCount = 0;
    let capturedAuthHeaderOnRetry: unknown;

    mock.onPost("/auth/refresh").reply(200, { message: "Refresh successful", accessToken: "fresh-token" });
    mock.onGet("/protected").reply((config) => {
      protectedCallCount++;
      if (protectedCallCount === 1) return [401, { message: "Unauthorized" }];
      capturedAuthHeaderOnRetry = config.headers?.Authorization;
      return [200, { data: "secret" }];
    });

    setAccessToken("stale-token");
    await api.get("/protected");
    expect(capturedAuthHeaderOnRetry).toBe("Bearer fresh-token");
  });
});
