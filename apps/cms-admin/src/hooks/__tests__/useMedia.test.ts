import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import MockAdapter from "axios-mock-adapter";
import type { ReactNode } from "react";
import { createElement } from "react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { useDeleteMedia, useMediaList, useUploadMedia } from "@/hooks/useMedia";
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

const asset = {
  documentId: "a1",
  fileName: "a1_abc123.jpg",
  mimeType: "image/jpeg",
  size: 1024,
  width: 800,
  height: 600,
  url: "https://cdn/a1.jpg",
  thumbnailUrl: "https://cdn/a1.jpg",
  publicId: "p1",
  hash: "abc123",
  uploadedBy: null,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

describe("useMediaList", () => {
  it("fetches the full (unpaginated) media list from GET /media", async () => {
    mock.onGet("/media").reply(200, [asset]);

    const { result } = renderHook(() => useMediaList(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual([asset]);
  });
});

describe("useUploadMedia", () => {
  it("sends the file as multipart form data to POST /media/upload", async () => {
    mock.onPost("/media/upload").reply(201, asset);
    const { result } = renderHook(() => useUploadMedia(), { wrapper: createWrapper() });

    const file = new File(["content"], "a1.jpg", { type: "image/jpeg" });
    result.current.mutate({ file });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mock.history.post[0].data).toBeInstanceOf(FormData);
  });
});

describe("useDeleteMedia", () => {
  it("sends DELETE to /media/{id}", async () => {
    mock.onDelete("/media/a1").reply(204);
    const { result } = renderHook(() => useDeleteMedia(), { wrapper: createWrapper() });

    result.current.mutate("a1");

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mock.history.delete).toHaveLength(1);
  });
});
