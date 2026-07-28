import { ContentTypePanel } from "../ContentTypePanel";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import MockAdapter from "axios-mock-adapter";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { api } from "@/lib/api";
import { renderWithProviders } from "@/test-utils";
import type { ContentType, Document } from "@/types/cms";

const ct: ContentType = {
  ID: "ct-1",
  Name: "Homepage",
  Slug: "homepage",
  Kind: "single",
  Fields: [
    { name: "title", type: "text" },
    { name: "heroImage", type: "media" },
  ],
  CreatedAt: "",
  UpdatedAt: "",
};

const doc: Document = {
  documentId: "ct-1",
  contentTypeId: "ct-1",
  status: "draft",
  data: { title: "Hello" },
  locale: "en",
  createdAt: "",
  updatedAt: "",
  createdBy: "",
  updatedBy: "",
};

let mock: MockAdapter;

beforeEach(() => {
  mock = new MockAdapter(api);
});

afterEach(() => {
  mock.restore();
});

describe("ContentTypePanel", () => {
  it("renders schema-driven fields from contentType.Fields", async () => {
    mock.onGet("/api/document-manager/single-type/homepage").reply(200, doc);
    mock.onGet("/api/locales").reply(200, [{ code: "en", name: "English", isDefault: true, createdAt: "", updatedAt: "" }]);
    mock.onGet("/api/document-manager/collection-type/homepage/ct-1").reply(200, doc);

    renderWithProviders(<ContentTypePanel contentType={ct} />);

    await waitFor(() => {
      expect(screen.getByLabelText("title")).toBeInTheDocument();
    });
  });

  it("does not show a Go Back link when no id prop is given", async () => {
    mock.onGet("/api/document-manager/single-type/homepage").reply(200, doc);
    mock.onGet("/api/locales").reply(200, [{ code: "en", name: "English", isDefault: true, createdAt: "", updatedAt: "" }]);

    renderWithProviders(<ContentTypePanel contentType={ct} />);

    await waitFor(() => expect(screen.queryByText(/go back/i)).not.toBeInTheDocument());
  });

  it("shows a Go Back link when id prop is given", async () => {
    const collectionDoc: Document = { ...doc, documentId: "entry-99" };
    mock.onGet("/api/document-manager/single-type/homepage").reply(200, collectionDoc);
    mock.onGet("/api/locales").reply(200, [{ code: "en", name: "English", isDefault: true, createdAt: "", updatedAt: "" }]);
    mock.onGet("/api/document-manager/collection-type/homepage/entry-99").reply(200, collectionDoc);

    renderWithProviders(<ContentTypePanel contentType={{ ...ct, Kind: "collection" }} id="entry-99" />);

    await waitFor(() => expect(screen.getByText(/go back/i)).toBeInTheDocument());
  });
});

describe("ContentTypePanel — locale dirty-guard", () => {
  const locales = [
    { code: "en", name: "English", isDefault: true, createdAt: "", updatedAt: "" },
    { code: "vi", name: "Vietnamese", isDefault: false, createdAt: "", updatedAt: "" },
  ];

  const enDoc: Document = { ...doc, data: { title: "Hello EN" }, locale: "en" };
  const viDoc: Document = { ...doc, data: { title: "Hello VI" }, locale: "vi" };

  function mockLocaleAwareDocument() {
    mock.onGet("/api/locales").reply(200, locales);
    mock.onGet("/api/document-manager/single-type/homepage").reply((config) => [200, config.params?.locale === "vi" ? viDoc : enDoc]);
  }

  it("shows a confirm dialog instead of switching locale when the form is dirty", async () => {
    const user = userEvent.setup();
    mockLocaleAwareDocument();

    renderWithProviders(<ContentTypePanel contentType={ct} />);
    await waitFor(() => expect(screen.getByLabelText("title")).toHaveValue("Hello EN"));

    await user.type(screen.getByLabelText("title"), " edited");

    await user.click(screen.getByRole("combobox"));
    await user.click(await screen.findByRole("option", { name: "Vietnamese" }));

    expect(await screen.findByText("Discard unsaved changes?")).toBeInTheDocument();
    expect(screen.getByLabelText("title")).toHaveValue("Hello EN edited");
  });

  it('confirming "Discard & switch" applies the locale change and clears the dirty form', async () => {
    const user = userEvent.setup();
    mockLocaleAwareDocument();

    renderWithProviders(<ContentTypePanel contentType={ct} />);
    await waitFor(() => expect(screen.getByLabelText("title")).toHaveValue("Hello EN"));

    await user.type(screen.getByLabelText("title"), " edited");
    await user.click(screen.getByRole("combobox"));
    await user.click(await screen.findByRole("option", { name: "Vietnamese" }));
    await screen.findByText("Discard unsaved changes?");

    await user.click(screen.getByRole("button", { name: /discard & switch/i }));

    await waitFor(() => expect(screen.queryByText("Discard unsaved changes?")).not.toBeInTheDocument());
    await waitFor(() => expect(screen.getByLabelText("title")).toHaveValue("Hello VI"));
  });

  it("cancelling leaves the form and locale untouched", async () => {
    const user = userEvent.setup();
    mockLocaleAwareDocument();

    renderWithProviders(<ContentTypePanel contentType={ct} />);
    await waitFor(() => expect(screen.getByLabelText("title")).toHaveValue("Hello EN"));

    await user.type(screen.getByLabelText("title"), " edited");
    await user.click(screen.getByRole("combobox"));
    await user.click(await screen.findByRole("option", { name: "Vietnamese" }));
    await screen.findByText("Discard unsaved changes?");

    await user.click(screen.getByRole("button", { name: /cancel/i }));

    await waitFor(() => expect(screen.queryByText("Discard unsaved changes?")).not.toBeInTheDocument());
    expect(screen.getByLabelText("title")).toHaveValue("Hello EN edited");
    expect(screen.getByRole("combobox")).toHaveTextContent("English");
  });

  it("switches locale immediately with no dialog when the form is clean", async () => {
    const user = userEvent.setup();
    mockLocaleAwareDocument();

    renderWithProviders(<ContentTypePanel contentType={ct} />);
    await waitFor(() => expect(screen.getByLabelText("title")).toHaveValue("Hello EN"));

    await user.click(screen.getByRole("combobox"));
    await user.click(await screen.findByRole("option", { name: "Vietnamese" }));

    await waitFor(() => expect(screen.getByLabelText("title")).toHaveValue("Hello VI"));
    expect(screen.queryByText("Discard unsaved changes?")).not.toBeInTheDocument();
  });
});

describe("ContentTypePanel — locale dropdown on the empty/no-draft state", () => {
  const locales = [
    { code: "en", name: "English", isDefault: true, createdAt: "", updatedAt: "" },
    { code: "vi", name: "Vietnamese", isDefault: false, createdAt: "", updatedAt: "" },
  ];

  it("shows the locale dropdown for a single-type with no draft yet", async () => {
    mock.onGet("/api/document-manager/single-type/homepage").reply(404);
    mock.onGet("/api/locales").reply(200, locales);

    renderWithProviders(<ContentTypePanel contentType={ct} />);

    await waitFor(() => expect(screen.getByLabelText("title")).toBeInTheDocument());
    expect(await screen.findByRole("combobox")).toBeInTheDocument();
  });

  it("shows the locale dropdown when creating a brand-new collection-type entry", async () => {
    mock.onGet("/api/locales").reply(200, locales);

    renderWithProviders(<ContentTypePanel contentType={{ ...ct, Kind: "collection" }} isNew />);

    await waitFor(() => expect(screen.getByLabelText("title")).toBeInTheDocument());
    expect(await screen.findByRole("combobox")).toBeInTheDocument();
  });

  it("switching locale while creating a new entry updates immediately with no discard dialog", async () => {
    const user = userEvent.setup();
    mock.onGet("/api/locales").reply(200, locales);

    renderWithProviders(<ContentTypePanel contentType={{ ...ct, Kind: "collection" }} isNew />);
    await waitFor(() => expect(screen.getByLabelText("title")).toBeInTheDocument());

    await user.type(screen.getByLabelText("title"), "Draft title");
    await user.click(await screen.findByRole("combobox"));
    await user.click(await screen.findByRole("option", { name: "Vietnamese" }));

    expect(screen.queryByText("Discard unsaved changes?")).not.toBeInTheDocument();
    expect(screen.getByRole("combobox")).toHaveTextContent("Vietnamese");
    expect(screen.getByLabelText("title")).toHaveValue("Draft title");
  });
});
