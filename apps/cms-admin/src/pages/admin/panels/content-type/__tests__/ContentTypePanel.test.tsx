import { ContentTypePanel } from "../ContentTypePanel";
import { screen, waitFor } from "@testing-library/react";
import MockAdapter from "axios-mock-adapter";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { api } from "@/lib/api";
import { renderWithProviders } from "@/test-utils";
import type { ContentType, Document } from "@/types/cms";

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
  mock = new MockAdapter(api);
});

afterEach(() => {
  mock.restore();
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

  it("shows the last-updated-by line when updatedBy is present", async () => {
    mock.onGet("/documents/single-type/homepage").reply(200, { data: { ...doc.data, updatedBy: { documentId: "u1", name: "Jane Admin" } } });

    renderWithProviders(<ContentTypePanel contentType={ct} />);

    await waitFor(() => expect(screen.getByText(/jane admin/i)).toBeInTheDocument());
  });
});
