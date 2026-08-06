import { FormField } from "../../FormField";
import { FormProvider } from "../../FormProvider";
import { MediaInput } from "../MediaInput";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import MockAdapter from "axios-mock-adapter";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { api } from "@/lib/api";
import { displayFileName } from "@/lib/media";

const mockUseAuth = vi.fn();
vi.mock("@/context/AuthContext", () => ({
  useAuth: () => mockUseAuth(),
}));

let mock: MockAdapter;

const mediaItems = [
  {
    documentId: "doc-uuid-1",
    url: "https://cdn/a1.jpg",
    thumbnailUrl: "https://cdn/a1.jpg",
    publicId: "p1",
    fileName: "avatar.jpg",
    mimeType: "image/jpeg",
    size: 1024,
    hash: "3a7bd3e2360a3d8f9c1b2e4a5d6f7089",
    width: 800,
    height: 600,
    uploadedBy: null,
    createdAt: "",
    updatedAt: "",
  },
];

beforeEach(() => {
  mockUseAuth.mockReturnValue({ permissions: ["media:manager"] });
  mock = new MockAdapter(api);
  mock.onGet("/media").reply(200, mediaItems);
});

afterEach(() => {
  mock.restore();
  vi.clearAllMocks();
});

function createClient() {
  return new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
}

function Wrapper({ children }: { children: React.ReactNode }) {
  return <QueryClientProvider client={createClient()}>{children}</QueryClientProvider>;
}

describe("MediaInput", () => {
  it("renders a clickable upload zone with placeholder text", () => {
    render(
      <Wrapper>
        <FormProvider mutationFn={vi.fn().mockResolvedValue(undefined)}>
          <FormField name="image">
            <MediaInput />
          </FormField>
        </FormProvider>
      </Wrapper>,
    );
    expect(screen.getByTestId("media-upload-zone")).toBeInTheDocument();
    expect(screen.getByText(/click to select media/i)).toBeInTheDocument();
  });

  it("opens the MediaLibrary dialog when zone is clicked", async () => {
    render(
      <Wrapper>
        <FormProvider mutationFn={vi.fn().mockResolvedValue(undefined)}>
          <FormField name="image">
            <MediaInput />
          </FormField>
        </FormProvider>
      </Wrapper>,
    );

    await userEvent.click(screen.getByTestId("media-upload-zone"));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("stores documentId, shows preview URL, and submits a plain string value when an asset is selected", async () => {
    const mutationFn = vi.fn().mockResolvedValue(undefined);
    render(
      <Wrapper>
        <FormProvider mutationFn={mutationFn}>
          <FormField name="image">
            <MediaInput />
          </FormField>
          <button type="submit">Submit</button>
        </FormProvider>
      </Wrapper>,
    );

    await userEvent.click(screen.getByTestId("media-upload-zone"));

    await waitFor(() => expect(screen.getAllByRole("img")).toHaveLength(1));
    await userEvent.click(screen.getByRole("img", { name: displayFileName(mediaItems[0]) }));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    const zoneImg = await screen.findByRole("img", { name: displayFileName(mediaItems[0]) });
    expect(zoneImg).toHaveAttribute("src", "https://cdn/a1.jpg");

    await userEvent.click(screen.getByRole("button", { name: /submit/i }));
    await waitFor(() => expect(mutationFn).toHaveBeenCalled());
    expect(mutationFn.mock.calls[0][0]).toEqual({ image: mediaItems[0].documentId });
  });

  it("resolves an existing documentId value to the matching asset once /media responds", async () => {
    render(
      <Wrapper>
        <FormProvider mutationFn={vi.fn().mockResolvedValue(undefined)} values={{ image: mediaItems[0].documentId }}>
          <FormField name="image">
            <MediaInput />
          </FormField>
        </FormProvider>
      </Wrapper>,
    );

    const zoneImg = await screen.findByRole("img", { name: displayFileName(mediaItems[0]) });
    expect(zoneImg).toHaveAttribute("src", "https://cdn/a1.jpg");
  });

  it("shows a loading placeholder while the media list is still fetching", async () => {
    mock.onGet("/media").reply(() => new Promise((resolve) => setTimeout(() => resolve([200, mediaItems]), 50)));

    render(
      <Wrapper>
        <FormProvider mutationFn={vi.fn().mockResolvedValue(undefined)} values={{ image: mediaItems[0].documentId }}>
          <FormField name="image">
            <MediaInput />
          </FormField>
        </FormProvider>
      </Wrapper>,
    );

    expect(screen.getByText(/loading/i)).toBeInTheDocument();
    expect(screen.queryByText(/click to select media/i)).not.toBeInTheDocument();
    expect(screen.queryByRole("img")).not.toBeInTheDocument();

    await screen.findByRole("img", { name: displayFileName(mediaItems[0]) });
  });

  it("shows a missing-asset placeholder when the documentId isn't found in the media list", async () => {
    render(
      <Wrapper>
        <FormProvider mutationFn={vi.fn().mockResolvedValue(undefined)} values={{ image: "deleted-doc-id" }}>
          <FormField name="image">
            <MediaInput />
          </FormField>
        </FormProvider>
      </Wrapper>,
    );

    await waitFor(() => expect(screen.getByText(/not found/i)).toBeInTheDocument());
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
    expect(screen.queryByText(/click to select media/i)).not.toBeInTheDocument();
  });

  it("closes the library without changing value when Close is clicked", async () => {
    render(
      <Wrapper>
        <FormProvider mutationFn={vi.fn().mockResolvedValue(undefined)}>
          <FormField name="image">
            <MediaInput />
          </FormField>
        </FormProvider>
      </Wrapper>,
    );

    await userEvent.click(screen.getByTestId("media-upload-zone"));
    expect(screen.getByRole("dialog")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /close/i }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.queryByRole("img", { name: /media preview/i })).not.toBeInTheDocument();
  });
});
