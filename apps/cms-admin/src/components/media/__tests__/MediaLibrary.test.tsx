import { MediaLibrary } from "../MediaLibrary";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import MockAdapter from "axios-mock-adapter";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { api } from "@/lib/api";
import { renderWithProviders } from "@/test-utils";

let mock: MockAdapter;

const mediaItems = [
  {
    documentId: "a1",
    fileName: "a1_abc.jpg",
    mimeType: "image/jpeg",
    size: 1024,
    width: 800,
    height: 600,
    url: "https://cdn/a1.jpg",
    thumbnailUrl: "https://cdn/a1.jpg",
    publicId: "p1",
    hash: "abc",
    uploadedBy: null,
    createdAt: "",
    updatedAt: "",
  },
  {
    documentId: "a2",
    fileName: "a2_def.jpg",
    mimeType: "image/jpeg",
    size: 2048,
    width: 800,
    height: 600,
    url: "https://cdn/a2.jpg",
    thumbnailUrl: "https://cdn/a2.jpg",
    publicId: "p2",
    hash: "def",
    uploadedBy: null,
    createdAt: "",
    updatedAt: "",
  },
];

beforeEach(() => {
  mock = new MockAdapter(api);
});

afterEach(() => {
  mock.restore();
  vi.clearAllMocks();
});

describe("MediaLibrary", () => {
  it("renders thumbnails from API when open", async () => {
    mock.onGet("/media").reply(200, mediaItems);

    renderWithProviders(<MediaLibrary isOpen onClose={vi.fn()} onSelect={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getAllByRole("img")).toHaveLength(2);
    });
  });

  it("calls onSelect and onClose when a thumbnail is clicked", async () => {
    mock.onGet("/media").reply(200, mediaItems);
    const onSelect = vi.fn();
    const onClose = vi.fn();

    renderWithProviders(<MediaLibrary isOpen onClose={onClose} onSelect={onSelect} />);

    await waitFor(() => expect(screen.getAllByRole("img")).toHaveLength(2));
    await userEvent.click(screen.getAllByRole("img")[0]);

    expect(onSelect).toHaveBeenCalledWith(mediaItems[0]);
    expect(onClose).toHaveBeenCalled();
  });

  it("does not render when isOpen is false", () => {
    renderWithProviders(<MediaLibrary isOpen={false} onClose={vi.fn()} onSelect={vi.fn()} />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("shows the total asset count with no pagination controls (GET /media is unpaginated)", async () => {
    mock.onGet("/media").reply(200, mediaItems);

    renderWithProviders(<MediaLibrary isOpen onClose={vi.fn()} onSelect={vi.fn()} />);

    await waitFor(() => expect(screen.getByText("2 assets")).toBeInTheDocument());
    expect(screen.queryByRole("button", { name: /next/i })).not.toBeInTheDocument();
  });

  // ---- Delete ----------------------------------------------------------------

  it("renders a delete button for each asset tile", async () => {
    mock.onGet("/media").reply(200, mediaItems);

    renderWithProviders(<MediaLibrary isOpen onClose={vi.fn()} onSelect={vi.fn()} />);

    await waitFor(() => expect(screen.getAllByRole("img")).toHaveLength(2));
    expect(screen.getAllByRole("button", { name: "Delete asset" })).toHaveLength(2);
  });

  it("opens confirm dialog on delete click (does not call API)", async () => {
    mock.onGet("/media").reply(200, mediaItems);
    let deleteCalled = false;
    mock.onDelete("/media/a1").reply(() => {
      deleteCalled = true;
      return [204];
    });

    renderWithProviders(<MediaLibrary isOpen onClose={vi.fn()} onSelect={vi.fn()} />);

    await waitFor(() => expect(screen.getAllByRole("img")).toHaveLength(2));
    const [firstDeleteBtn] = screen.getAllByRole("button", { name: "Delete asset" });
    await userEvent.click(firstDeleteBtn);

    expect(screen.getByText(/are you sure you want to delete/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Delete" })).toBeInTheDocument();
    expect(deleteCalled).toBe(false);
  });

  it("fires DELETE on confirm and invalidates the list", async () => {
    mock.onGet("/media").reply(200, mediaItems);
    mock.onDelete("/media/a1").reply(204);

    renderWithProviders(<MediaLibrary isOpen onClose={vi.fn()} onSelect={vi.fn()} />);

    await waitFor(() => expect(screen.getAllByRole("img")).toHaveLength(2));
    const [firstDeleteBtn] = screen.getAllByRole("button", { name: "Delete asset" });
    await userEvent.click(firstDeleteBtn);

    const confirmBtn = screen.getByRole("button", { name: "Delete" });
    await userEvent.click(confirmBtn);

    await waitFor(() => expect(mock.history.delete).toHaveLength(1));
    expect(mock.history.delete[0].url).toBe("/media/a1");
  });

  it("closes confirm dialog on cancel click", async () => {
    mock.onGet("/media").reply(200, mediaItems);

    renderWithProviders(<MediaLibrary isOpen onClose={vi.fn()} onSelect={vi.fn()} />);

    await waitFor(() => expect(screen.getAllByRole("img")).toHaveLength(2));
    const [firstDeleteBtn] = screen.getAllByRole("button", { name: "Delete asset" });
    await userEvent.click(firstDeleteBtn);

    expect(screen.getByText(/are you sure you want to delete/i)).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Cancel" }));

    await waitFor(() => expect(screen.queryByText(/are you sure you want to delete/i)).not.toBeInTheDocument());
  });
});
