import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import MockAdapter from "axios-mock-adapter";
import type { ReactNode } from "react";
import { createElement } from "react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { useAccessTokenList, useCreateAccessToken, useDeleteAccessToken, useRevokeAccessToken } from "@/hooks/useAccessTokens";
import { api } from "@/lib/api";

let mock: MockAdapter;

beforeEach(() => {
  mock = new MockAdapter(api);
});

afterEach(() => {
  mock.restore();
});

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return function Wrapper({ children }: { children: ReactNode }) {
    return createElement(QueryClientProvider, { client: queryClient }, children);
  };
}

const token = {
  documentId: "t1",
  name: "CI token",
  permissions: ["document:read"],
  expiresAt: null,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
  updatedBy: null,
};

describe("useAccessTokenList", () => {
  it("returns the full (unpaginated) token list from GET /access-tokens, with no token field", async () => {
    mock.onGet("/access-tokens").reply(200, [token]);
    const { result } = renderHook(() => useAccessTokenList(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual([token]);
  });
});

describe("useCreateAccessToken", () => {
  it("sends POST to /access-tokens with name/permissions/expiresIn and returns the plaintext token once", async () => {
    mock.onPost("/access-tokens").reply(201, { ...token, token: "plaintext-secret" });
    const { result } = renderHook(() => useCreateAccessToken(), { wrapper: createWrapper() });

    result.current.mutate({ name: "CI token", permissions: ["document:read"], expiresIn: "never" });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(JSON.parse(mock.history.post[0].data)).toEqual({ name: "CI token", permissions: ["document:read"], expiresIn: "never" });
    expect(result.current.data?.token).toBe("plaintext-secret");
  });
});

describe("useRevokeAccessToken", () => {
  it("sends POST to /access-tokens/{id}/revoke and returns a new plaintext token", async () => {
    mock.onPost("/access-tokens/t1/revoke").reply(200, { ...token, token: "new-plaintext-secret" });
    const { result } = renderHook(() => useRevokeAccessToken(), { wrapper: createWrapper() });

    result.current.mutate({ id: "t1" });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.token).toBe("new-plaintext-secret");
  });
});

describe("useDeleteAccessToken", () => {
  it("sends DELETE to /access-tokens/{id}", async () => {
    mock.onDelete("/access-tokens/t1").reply(204);
    const { result } = renderHook(() => useDeleteAccessToken(), { wrapper: createWrapper() });

    result.current.mutate("t1");

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mock.history.delete).toHaveLength(1);
  });
});
