import { PermissionTree } from "@/components/permissions/PermissionTree";
import type { PermissionItem } from "@/hooks/usePermissions";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/hooks/useContentTypes", () => ({
  useContentTypes: () => ({
    data: [
      { name: "Cv Page", slug: "cv-page", kind: "single", draftToPublish: true },
      { name: "Cv Contact", slug: "cv-contact", kind: "collection", draftToPublish: true },
    ],
  }),
}));

const PERMISSIONS: PermissionItem[] = [
  { documentId: "p1", slug: "document:read", name: "Read documents", description: "Read any document" },
  { documentId: "p2", slug: "document:create", name: "Create documents", description: "Create any document" },
  { documentId: "p3", slug: "document:read:cv-page", name: "Read Cv Page documents", description: "Read cv-page documents" },
  { documentId: "p4", slug: "document:read:cv-contact", name: "Read Cv Contact documents", description: "Read cv-contact documents" },
  { documentId: "p5", slug: "media:read", name: "Read media", description: "Read media" },
];

function renderTree(selected: string[], onChange = vi.fn()) {
  render(<PermissionTree permissions={PERMISSIONS} selected={selected} onChange={onChange} />);
  return { onChange };
}

function ControlledPermissionTree({ initialSelected }: { initialSelected: string[] }) {
  const [selected, setSelected] = useState<string[]>(initialSelected);
  return (
    <>
      <PermissionTree permissions={PERMISSIONS} selected={selected} onChange={setSelected} />
      <div data-testid="selected-debug">{JSON.stringify(selected)}</div>
    </>
  );
}

describe("PermissionTree — document group content-type scoping", () => {
  it("defaults an action to 'All content types' mode with the global checkbox unchecked when nothing is selected", () => {
    renderTree([]);
    const readRow = within(screen.getByTestId("document-permission-read"));
    expect(readRow.getByRole("radio", { name: /all content types/i })).toBeChecked();
    expect(readRow.getByRole("checkbox", { name: /read documents/i })).not.toBeChecked();
  });

  it("checking the global checkbox in 'All content types' mode grants the global document slug", async () => {
    const { onChange } = renderTree([]);
    const readRow = within(screen.getByTestId("document-permission-read"));
    await userEvent.click(readRow.getByRole("checkbox", { name: /read documents/i }));
    expect(onChange).toHaveBeenCalledWith(["document:read"]);
  });

  it("defaults an action to 'Specific content types' mode when a scoped slug is already selected", () => {
    renderTree(["document:read:cv-page"]);
    const readRow = within(screen.getByTestId("document-permission-read"));
    expect(readRow.getByRole("radio", { name: /specific content types/i })).toBeChecked();
    expect(readRow.getByRole("checkbox", { name: "Cv Page" })).toBeChecked();
    expect(readRow.getByRole("checkbox", { name: "Cv Contact" })).not.toBeChecked();
  });

  it("checking a content-type box in 'Specific content types' mode grants the scoped slug", async () => {
    const { onChange } = renderTree(["document:read:cv-page"]);
    const readRow = within(screen.getByTestId("document-permission-read"));
    await userEvent.click(readRow.getByRole("checkbox", { name: "Cv Contact" }));
    expect(onChange).toHaveBeenCalledWith(["document:read:cv-page", "document:read:cv-contact"]);
  });

  it("switching an action from 'All content types' to 'Specific content types' clears the global slug for that action", async () => {
    const { onChange } = renderTree(["document:read", "document:create"]);
    const readRow = within(screen.getByTestId("document-permission-read"));
    await userEvent.click(readRow.getByRole("radio", { name: /specific content types/i }));
    expect(onChange).toHaveBeenCalledWith(["document:create"]);
  });

  it("switching an action from 'Specific content types' to 'All content types' clears the scoped slugs for that action", async () => {
    const { onChange } = renderTree(["document:read:cv-page", "document:read:cv-contact", "document:create"]);
    const readRow = within(screen.getByTestId("document-permission-read"));
    await userEvent.click(readRow.getByRole("radio", { name: /all content types/i }));
    expect(onChange).toHaveBeenCalledWith(["document:create"]);
  });

  it("does not affect other actions' selections when toggling one action's mode", async () => {
    const { onChange } = renderTree(["document:read", "document:create:cv-page"]);
    const readRow = within(screen.getByTestId("document-permission-read"));
    await userEvent.click(readRow.getByRole("radio", { name: /specific content types/i }));
    expect(onChange).toHaveBeenCalledWith(["document:create:cv-page"]);
  });

  it("leaves other permission groups unaffected", () => {
    renderTree(["media:read"]);
    expect(screen.getByText("media")).toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: /read media/i })).toBeChecked();
  });
});

describe("PermissionTree — document group reconciles mode/state after external selection changes", () => {
  it("flips an action to 'Specific content types' and drops the now-redundant global slug when Select All grants both the global and scoped slugs at once", async () => {
    render(<ControlledPermissionTree initialSelected={[]} />);

    await userEvent.click(screen.getByRole("checkbox", { name: /select all/i }));

    const readRow = within(screen.getByTestId("document-permission-read"));
    expect(readRow.getByRole("radio", { name: /specific content types/i })).toBeChecked();
    expect(readRow.getByRole("checkbox", { name: "Cv Page" })).toBeChecked();
    expect(readRow.getByRole("checkbox", { name: "Cv Contact" })).toBeChecked();

    await waitFor(() => {
      const selectedDebug: string[] = JSON.parse(screen.getByTestId("selected-debug").textContent ?? "[]");
      expect(selectedDebug).not.toContain("document:read");
      expect(selectedDebug).toEqual(expect.arrayContaining(["document:read:cv-page", "document:read:cv-contact"]));
    });
  });

  it("re-derives mode when the selected prop changes after mount without the component remounting", () => {
    const { rerender } = render(<PermissionTree permissions={PERMISSIONS} selected={[]} onChange={vi.fn()} />);

    let readRow = within(screen.getByTestId("document-permission-read"));
    expect(readRow.getByRole("radio", { name: /all content types/i })).toBeChecked();

    rerender(<PermissionTree permissions={PERMISSIONS} selected={["document:read:cv-page"]} onChange={vi.fn()} />);

    readRow = within(screen.getByTestId("document-permission-read"));
    expect(readRow.getByRole("radio", { name: /specific content types/i })).toBeChecked();
    expect(readRow.getByRole("checkbox", { name: "Cv Page" })).toBeChecked();
  });
});
