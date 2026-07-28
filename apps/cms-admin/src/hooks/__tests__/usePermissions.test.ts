import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import MockAdapter from "axios-mock-adapter";
import type { ReactNode } from "react";
import { createElement } from "react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { useCreatePermission, useDeletePermission, usePermissions, useUpdatePermission } from "@/hooks/usePermissions";
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

const permission = { documentId: "p1", slug: "document:read", name: "Read Documents", description: "View documents" };

describe("usePermissions", () => {
  it("returns list of permissions from GET /api/permissions", async () => {
    mock.onGet("/api/permissions").reply(200, [permission]);
    const { result } = renderHook(() => usePermissions(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual([permission]);
  });
});

describe("useCreatePermission", () => {
  it("sends POST to /api/permissions and invalidates the list", async () => {
    mock.onGet("/api/permissions").reply(200, []);
    mock.onPost("/api/permissions").reply(201, permission);

    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
    const wrapper = ({ children }: { children: ReactNode }) => createElement(QueryClientProvider, { client: queryClient }, children);

    const { result: listResult } = renderHook(() => usePermissions(), { wrapper });
    await waitFor(() => expect(listResult.current.isSuccess).toBe(true));

    const { result: createResult } = renderHook(() => useCreatePermission(), { wrapper });
    createResult.current.mutate({ slug: "document:read", name: "Read Documents", description: "View documents" });

    await waitFor(() => expect(createResult.current.isSuccess).toBe(true));
    expect(JSON.parse(mock.history.post[0].data)).toEqual({ slug: "document:read", name: "Read Documents", description: "View documents" });
    expect(listResult.current.isStale).toBe(true);
  });
});

describe("useUpdatePermission", () => {
  it("sends PUT to /api/permissions/{id} and invalidates the list", async () => {
    mock.onGet("/api/permissions").reply(200, []);
    mock.onPut("/api/permissions/p1").reply(200, { ...permission, name: "Read Docs (renamed)" });

    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
    const wrapper = ({ children }: { children: ReactNode }) => createElement(QueryClientProvider, { client: queryClient }, children);

    const { result: listResult } = renderHook(() => usePermissions(), { wrapper });
    await waitFor(() => expect(listResult.current.isSuccess).toBe(true));

    const { result: updateResult } = renderHook(() => useUpdatePermission(), { wrapper });
    updateResult.current.mutate({ documentId: "p1", data: { name: "Read Docs (renamed)" } });

    await waitFor(() => expect(updateResult.current.isSuccess).toBe(true));
    expect(JSON.parse(mock.history.put[0].data)).toEqual({ name: "Read Docs (renamed)" });
    expect(listResult.current.isStale).toBe(true);
  });
});

describe("useDeletePermission", () => {
  it("sends DELETE to /api/permissions/{id}", async () => {
    mock.onDelete("/api/permissions/p1").reply(204);
    const { result } = renderHook(() => useDeletePermission(), { wrapper: createWrapper() });

    result.current.mutate("p1");

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mock.history.delete).toHaveLength(1);
  });
});
