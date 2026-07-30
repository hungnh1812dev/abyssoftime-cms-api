import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import MockAdapter from "axios-mock-adapter";
import type { ReactNode } from "react";
import { createElement } from "react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { useContentTypeBySlug, useContentTypes, useUpdateListFields } from "@/hooks/useContentTypes";
import { api } from "@/lib/api";
import type { ContentType } from "@/types/cms";

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

const ct: ContentType = {
  documentId: "doc-1",
  name: "Blog",
  slug: "blog",
  kind: "collection",
  draftToPublish: true,
  fields: [{ name: "title", type: "text" }],
  listFields: ["title"],
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

describe("useContentTypes", () => {
  it("returns list of content types from GET /content-types", async () => {
    const summary = { slug: ct.slug, name: ct.name, kind: ct.kind, draftToPublish: ct.draftToPublish };
    mock.onGet("/content-types").reply(200, [summary]);
    const { result } = renderHook(() => useContentTypes(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual([summary]);
  });
});

describe("useContentTypeBySlug", () => {
  it("returns a content type from GET /content-types/{slug}", async () => {
    mock.onGet("/content-types/blog").reply(200, ct);
    const { result } = renderHook(() => useContentTypeBySlug("blog"), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(ct);
  });

  it("is disabled when slug is empty", () => {
    const { result } = renderHook(() => useContentTypeBySlug(""), { wrapper: createWrapper() });
    expect(result.current.fetchStatus).toBe("idle");
  });
});

describe("useUpdateListFields", () => {
  it("sends PATCH to /content-types/{slug}/list-fields and returns the full content type", async () => {
    mock.onPatch("/content-types/blog/list-fields").reply(200, { ...ct, listFields: ["title", "slug"] });
    const { result } = renderHook(() => useUpdateListFields(), { wrapper: createWrapper() });

    result.current.mutate({ slug: "blog", listFields: ["title", "slug"] });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mock.history.patch).toHaveLength(1);
    expect(JSON.parse(mock.history.patch[0].data)).toEqual({ listFields: ["title", "slug"] });
    expect(result.current.data?.listFields).toEqual(["title", "slug"]);
  });
});
