import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import MockAdapter from "axios-mock-adapter";
import type { ReactNode } from "react";
import { createElement } from "react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { useDeleteUser, useUpdateUserRole, useUserList } from "@/hooks/useUsers";
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

const user = {
  documentId: "u1",
  email: "user@example.com",
  name: "User One",
  username: "userone",
  accountType: true,
  verified: true,
  roleId: "r1",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

describe("useUserList", () => {
  it("returns the full (unpaginated) user list from GET /users", async () => {
    mock.onGet("/users").reply(200, [user]);
    const { result } = renderHook(() => useUserList(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual([user]);
  });
});

describe("useUpdateUserRole", () => {
  it("sends PATCH to /users/{id}/role with { roleId }", async () => {
    mock.onPatch("/users/u1/role").reply(200, { ...user, roleId: "r2" });
    const { result } = renderHook(() => useUpdateUserRole(), { wrapper: createWrapper() });

    result.current.mutate({ id: "u1", roleId: "r2" });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(JSON.parse(mock.history.patch[0].data)).toEqual({ roleId: "r2" });
  });
});

describe("useDeleteUser", () => {
  it("sends DELETE to /users/{id}", async () => {
    mock.onDelete("/users/u1").reply(204);
    const { result } = renderHook(() => useDeleteUser(), { wrapper: createWrapper() });

    result.current.mutate("u1");

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mock.history.delete).toHaveLength(1);
  });
});
