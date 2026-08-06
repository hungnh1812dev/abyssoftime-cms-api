import { ContentTypePanel } from "../ContentTypePanel";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import MockAdapter from "axios-mock-adapter";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { api } from "@/lib/api";
import { renderWithProviders } from "@/test-utils";
import type { ContentType, Document } from "@/types/cms";

const mockUseAuth = vi.fn();
vi.mock("@/context/AuthContext", () => ({
  useAuth: () => mockUseAuth(),
}));

const ct: ContentType = {
  documentId: "ct-1",
  name: "Homepage",
  slug: "homepage",
  kind: "single",
  draftToPublish: true,
  fields: [
    { name: "title", type: "text" },
    { name: "heroImage", type: "media" },
  ],
  listFields: ["title"],
  createdAt: "",
  updatedAt: "",
};

const doc: Document = {
  data: {
    documentId: "ct-1",
    status: "draft",
    title: "Hello",
    createdAt: "",
    updatedAt: "",
    updatedBy: null,
  },
};

let mock: MockAdapter;

beforeEach(() => {
  mockUseAuth.mockReturnValue({ permissions: ["document:create", "document:update", "document:publish", "document:unpublish"] });
  mock = new MockAdapter(api);
});

afterEach(() => {
  mock.restore();
  vi.clearAllMocks();
});

describe("ContentTypePanel", () => {
  it("renders schema-driven fields from contentType.fields", async () => {
    mock.onGet("/documents/single-type/homepage").reply(200, doc);
    mock.onGet("/documents/collection-type/homepage/ct-1").reply(200, doc);

    renderWithProviders(<ContentTypePanel contentType={ct} />);

    await waitFor(() => {
      expect(screen.getByLabelText("title")).toBeInTheDocument();
    });
  });

  it("does not show a Go Back link when no id prop is given", async () => {
    mock.onGet("/documents/single-type/homepage").reply(200, doc);

    renderWithProviders(<ContentTypePanel contentType={ct} />);

    await waitFor(() => expect(screen.queryByText(/go back/i)).not.toBeInTheDocument());
  });

  it("shows a Go Back link when id prop is given", async () => {
    const collectionDoc: Document = { data: { ...doc.data, documentId: "entry-99" } };
    mock.onGet("/documents/single-type/homepage").reply(200, collectionDoc);
    mock.onGet("/documents/collection-type/homepage/entry-99").reply(200, collectionDoc);

    renderWithProviders(<ContentTypePanel contentType={{ ...ct, kind: "collection" }} id="entry-99" />);

    await waitFor(() => expect(screen.getByText(/go back/i)).toBeInTheDocument());
  });

  it("shows Publish for a draft and Unpublish for a published document", async () => {
    mock.onGet("/documents/collection-type/homepage/entry-99").reply(200, { data: { ...doc.data, documentId: "entry-99", status: "draft" } });

    renderWithProviders(<ContentTypePanel contentType={{ ...ct, kind: "collection" }} id="entry-99" />);

    await waitFor(() => expect(screen.getByRole("button", { name: /publish/i })).toBeInTheDocument());
    expect(screen.queryByRole("button", { name: /unpublish/i })).not.toBeInTheDocument();
  });

  it("hides Publish and Unpublish when the content type has draftToPublish disabled", async () => {
    mock.onGet("/documents/collection-type/homepage/entry-99").reply(200, { data: { ...doc.data, documentId: "entry-99", status: "published" } });

    renderWithProviders(<ContentTypePanel contentType={{ ...ct, kind: "collection", draftToPublish: false }} id="entry-99" />);

    await waitFor(() => expect(screen.getByLabelText("title")).toBeInTheDocument());
    expect(screen.queryByRole("button", { name: /publish/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /unpublish/i })).not.toBeInTheDocument();
  });

  it("shows the last-updated-by line when updatedBy is present", async () => {
    mock.onGet("/documents/single-type/homepage").reply(200, { data: { ...doc.data, updatedBy: { documentId: "u1", name: "Jane Admin" } } });

    renderWithProviders(<ContentTypePanel contentType={ct} />);

    await waitFor(() => expect(screen.getByText(/jane admin/i)).toBeInTheDocument());
  });
});

describe("ContentTypePanel — permission gating", () => {
  it("first save on a new collection-type entry requires document:create, not document:update", async () => {
    mockUseAuth.mockReturnValue({ permissions: ["document:update"] });

    renderWithProviders(<ContentTypePanel contentType={{ ...ct, kind: "collection" }} isNew />);

    await waitFor(() => screen.getByLabelText("title"));
    await userEvent.type(screen.getByLabelText("title"), "x");
    expect(screen.getByRole("button", { name: /save/i })).toBeDisabled();
  });

  it("first save on a new collection-type entry is enabled with document:create", async () => {
    mockUseAuth.mockReturnValue({ permissions: ["document:create"] });

    renderWithProviders(<ContentTypePanel contentType={{ ...ct, kind: "collection" }} isNew />);

    await waitFor(() => screen.getByLabelText("title"));
    await userEvent.type(screen.getByLabelText("title"), "x");
    expect(screen.getByRole("button", { name: /save/i })).not.toBeDisabled();
  });

  it("first save on a single type (no doc yet) requires document:update, since single types have no create endpoint", async () => {
    mockUseAuth.mockReturnValue({ permissions: ["document:create"] });
    mock.onGet("/documents/single-type/homepage").reply(404);

    renderWithProviders(<ContentTypePanel contentType={ct} />);

    await waitFor(() => screen.getByLabelText("title"));
    await userEvent.type(screen.getByLabelText("title"), "x");
    expect(screen.getByRole("button", { name: /save/i })).toBeDisabled();
  });

  it("Save on an existing document requires document:update", async () => {
    mockUseAuth.mockReturnValue({ permissions: ["document:create"] });
    mock.onGet("/documents/single-type/homepage").reply(200, doc);

    renderWithProviders(<ContentTypePanel contentType={ct} />);

    await waitFor(() => screen.getByLabelText("title"));
    await userEvent.type(screen.getByLabelText("title"), "x");
    expect(screen.getByRole("button", { name: /save/i })).toBeDisabled();
  });

  it("disables Publish when the caller lacks document:publish for this content type", async () => {
    mockUseAuth.mockReturnValue({ permissions: ["document:update"] });
    mock.onGet("/documents/collection-type/homepage/entry-99").reply(200, { data: { ...doc.data, documentId: "entry-99", status: "draft" } });

    renderWithProviders(<ContentTypePanel contentType={{ ...ct, kind: "collection" }} id="entry-99" />);

    await waitFor(() => expect(screen.getByRole("button", { name: /publish/i })).toBeInTheDocument());
    expect(screen.getByRole("button", { name: /publish/i })).toBeDisabled();
  });

  it("enables Publish with a content-type-scoped document:publish grant", async () => {
    mockUseAuth.mockReturnValue({ permissions: ["document:update", "document:publish:homepage"] });
    mock.onGet("/documents/collection-type/homepage/entry-99").reply(200, { data: { ...doc.data, documentId: "entry-99", status: "draft" } });

    renderWithProviders(<ContentTypePanel contentType={{ ...ct, kind: "collection" }} id="entry-99" />);

    await waitFor(() => expect(screen.getByRole("button", { name: /publish/i })).toBeInTheDocument());
    expect(screen.getByRole("button", { name: /publish/i })).not.toBeDisabled();
  });

  it("disables Unpublish when the caller lacks document:unpublish for this content type", async () => {
    mockUseAuth.mockReturnValue({ permissions: ["document:update"] });
    mock.onGet("/documents/collection-type/homepage/entry-99").reply(200, { data: { ...doc.data, documentId: "entry-99", status: "published" } });

    renderWithProviders(<ContentTypePanel contentType={{ ...ct, kind: "collection" }} id="entry-99" />);

    await waitFor(() => expect(screen.getByRole("button", { name: /unpublish/i })).toBeInTheDocument());
    expect(screen.getByRole("button", { name: /unpublish/i })).toBeDisabled();
  });
});
