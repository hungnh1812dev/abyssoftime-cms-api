import { MediaLibraryPage } from "../MediaLibraryPage";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import MockAdapter from "axios-mock-adapter";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { api } from "@/lib/api";
import { renderWithProviders } from "@/test-utils";

const mockUseAuth = vi.fn();
vi.mock("@/context/AuthContext", () => ({
  useAuth: () => mockUseAuth(),
}));

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
  mockUseAuth.mockReturnValue({ permissions: ["media:manager"] });
  mock = new MockAdapter(api);
  mock.onGet("/media").reply(200, mediaItems);
});

afterEach(() => {
  mock.restore();
  vi.clearAllMocks();
});

describe("MediaLibraryPage", () => {
  it("renders thumbnails and the asset count from the API", async () => {
    renderWithProviders(<MediaLibraryPage />);
    await waitFor(() => {
      expect(screen.getAllByRole("img")).toHaveLength(2);
      expect(screen.getByText("2 assets")).toBeInTheDocument();
    });
  });

  it("does not show the Upload button until a file is staged", async () => {
    renderWithProviders(<MediaLibraryPage />);
    await waitFor(() => screen.getByText("Choose files"));
    expect(screen.queryByRole("button", { name: /upload/i })).not.toBeInTheDocument();
  });

  it("shows the Upload button and uploads staged files on click", async () => {
    mock.onPost("/media/upload").reply(201, mediaItems[0]);
    const user = userEvent.setup();
    renderWithProviders(<MediaLibraryPage />);
    await waitFor(() => screen.getByLabelText(/choose files/i));

    const file = new File(["contents"], "photo.png", { type: "image/png" });
    await user.upload(screen.getByLabelText(/choose files/i), file);

    const uploadButton = await screen.findByRole("button", { name: /upload 1 file/i });
    await user.click(uploadButton);

    await waitFor(() => expect(mock.history.post).toHaveLength(1));
  });

  it("renders a delete button for each asset tile", async () => {
    renderWithProviders(<MediaLibraryPage />);
    await waitFor(() => expect(screen.getAllByRole("img")).toHaveLength(2));
    expect(screen.getAllByRole("button", { name: "Delete asset" })).toHaveLength(2);
  });

  it("opens the confirm dialog on delete click and deletes on confirm", async () => {
    mock.onDelete("/media/a1").reply(204);
    const user = userEvent.setup();
    renderWithProviders(<MediaLibraryPage />);

    await waitFor(() => expect(screen.getAllByRole("img")).toHaveLength(2));
    const [firstDeleteBtn] = screen.getAllByRole("button", { name: "Delete asset" });
    await user.click(firstDeleteBtn);

    expect(screen.getByText(/are you sure you want to delete/i)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Delete" }));

    await waitFor(() => expect(mock.history.delete).toHaveLength(1));
    expect(mock.history.delete[0].url).toBe("/media/a1");
  });
});

describe("MediaLibraryPage — permission gating", () => {
  it("enables Upload and per-asset Delete when the caller holds media:manager", async () => {
    const user = userEvent.setup();
    renderWithProviders(<MediaLibraryPage />);
    await waitFor(() => expect(screen.getAllByRole("img")).toHaveLength(2));

    expect(screen.getAllByRole("button", { name: "Delete asset" })[0]).not.toBeDisabled();

    const file = new File(["contents"], "photo.png", { type: "image/png" });
    await user.upload(screen.getByLabelText(/choose files/i), file);
    expect(await screen.findByRole("button", { name: /upload 1 file/i })).not.toBeDisabled();
  });

  it("disables Upload and per-asset Delete when the caller lacks media:manager", async () => {
    mockUseAuth.mockReturnValue({ permissions: [] });
    const user = userEvent.setup();
    renderWithProviders(<MediaLibraryPage />);
    await waitFor(() => expect(screen.getAllByRole("img")).toHaveLength(2));

    expect(screen.getAllByRole("button", { name: "Delete asset" })[0]).toBeDisabled();

    const file = new File(["contents"], "photo.png", { type: "image/png" });
    await user.upload(screen.getByLabelText(/choose files/i), file);
    expect(await screen.findByRole("button", { name: /upload 1 file/i })).toBeDisabled();
  });
});
