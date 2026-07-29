import { SidebarProvider, useSidebar } from "../SidebarContext";
import { SidebarShell } from "../SidebarShell";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/hooks/useContentTypes", () => ({
  useContentTypes: () => ({
    data: [
      { name: "Homepage", slug: "homepage", kind: "single", draftToPublish: true },
      { name: "Articles", slug: "articles", kind: "collection", draftToPublish: true },
    ],
  }),
}));

const ALL_SETTINGS_PERMISSIONS = ["media:read", "user:read", "api_token:manager", "role:manager", "permission:manager"];

const superAdminRole = { documentId: "r1", name: "Super Admin", slug: "super_admin", permissions: ALL_SETTINGS_PERMISSIONS, level: 100, isDefault: true };

const mockUseAuth = vi.fn(() => ({
  role: superAdminRole,
  displayName: "Jane Admin",
  permissions: ALL_SETTINGS_PERMISSIONS,
  token: "x",
  userId: "1",
  loading: false,
  login: vi.fn(),
  logout: vi.fn(),
}));

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => mockUseAuth(),
}));

function renderSidebar(initialPath = "/admin") {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <SidebarProvider>
        <SidebarShell />
      </SidebarProvider>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  localStorage.clear();
  mockUseAuth.mockReturnValue({
    role: superAdminRole,
    displayName: "Jane Admin",
    permissions: ALL_SETTINGS_PERMISSIONS,
    token: "x",
    userId: "1",
    loading: false,
    login: vi.fn(),
    logout: vi.fn(),
  });
});

describe("Sidebar", () => {
  it("renders brand text", () => {
    renderSidebar();
    expect(screen.getByText("AbyssOfTime CMS")).toBeInTheDocument();
  });

  it("renders Content Manager group with content type items", () => {
    renderSidebar();
    expect(screen.getByText("Content Manager")).toBeInTheDocument();
    expect(screen.getByText("Homepage")).toBeInTheDocument();
    expect(screen.getByText("Articles")).toBeInTheDocument();
  });

  it("renders Single Types and Collection Types sub-groups", () => {
    renderSidebar();
    expect(screen.getByText("Single Types")).toBeInTheDocument();
    expect(screen.getByText("Collection Types")).toBeInTheDocument();
  });

  it("renders Settings group with nav items", () => {
    renderSidebar();
    expect(screen.getByText("Settings")).toBeInTheDocument();
    expect(screen.getByText("Media Library")).toBeInTheDocument();
    expect(screen.getByText("Users")).toBeInTheDocument();
    expect(screen.getByText("Access Tokens")).toBeInTheDocument();
    expect(screen.getByText("Roles")).toBeInTheDocument();
    expect(screen.getByText("Permissions")).toBeInTheDocument();
  });

  it("renders collapse toggle button", () => {
    renderSidebar();
    expect(screen.getByRole("button", { name: /collapse/i })).toBeInTheDocument();
  });

  it("collapses sidebar when toggle is clicked", async () => {
    renderSidebar();
    const sidebar = screen.getByRole("complementary");
    expect(sidebar.className).toContain("w-64");

    await userEvent.click(screen.getByRole("button", { name: /collapse/i }));
    expect(sidebar.className).toContain("w-16");
  });

  it("hides text labels when collapsed", async () => {
    renderSidebar();
    await userEvent.click(screen.getByRole("button", { name: /collapse/i }));
    const brand = screen.queryByText("AbyssOfTime CMS");
    expect(brand).not.toBeVisible();
  });

  it("generates correct links for content types", () => {
    renderSidebar();
    const homepageLink = screen.getByRole("link", { name: "Homepage" });
    expect(homepageLink).toHaveAttribute("href", "/admin/content-type/single-type/homepage");
    const articlesLink = screen.getByRole("link", { name: "Articles" });
    expect(articlesLink).toHaveAttribute("href", "/admin/content-type/collection-type/articles");
  });

  it("generates correct links for settings items", () => {
    renderSidebar();
    expect(screen.getByRole("link", { name: "Media Library" })).toHaveAttribute("href", "/admin/settings/media");
    expect(screen.getByRole("link", { name: "Users" })).toHaveAttribute("href", "/admin/settings/users");
  });

  it("shows the display name with the role name in parentheses in the footer, not the role slug", () => {
    renderSidebar();
    expect(screen.getByText("Jane Admin (Super Admin)")).toBeInTheDocument();
    expect(screen.queryByText("super_admin")).not.toBeInTheDocument();
  });

  it("shows just the display name when the caller has no role", () => {
    mockUseAuth.mockReturnValue({
      role: null,
      displayName: "Jane Admin",
      permissions: ALL_SETTINGS_PERMISSIONS,
      token: "x",
      userId: "1",
      loading: false,
      login: vi.fn(),
      logout: vi.fn(),
    });
    renderSidebar();
    expect(screen.getByText("Jane Admin")).toBeInTheDocument();
  });
});

describe("Sidebar — permission-based gating (CATALOG-T11)", () => {
  it("omits every settings link from the DOM (not just disables) when the role has no permissions", () => {
    mockUseAuth.mockReturnValue({ role: "guest", permissions: [], token: "x", userId: "1", loading: false, login: vi.fn(), logout: vi.fn() });
    renderSidebar();

    expect(screen.queryByText("Media Library")).not.toBeInTheDocument();
    expect(screen.queryByText("Users")).not.toBeInTheDocument();
    expect(screen.queryByText("Access Tokens")).not.toBeInTheDocument();
    expect(screen.queryByText("Roles")).not.toBeInTheDocument();
    expect(screen.queryByText("Permissions")).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Media Library" })).not.toBeInTheDocument();
  });

  it("shows only the links matching the granted permissions", () => {
    mockUseAuth.mockReturnValue({ role: "editor", permissions: ["media:read", "user:read"], token: "x", userId: "1", loading: false, login: vi.fn(), logout: vi.fn() });
    renderSidebar();

    expect(screen.getByText("Media Library")).toBeInTheDocument();
    expect(screen.getByText("Users")).toBeInTheDocument();
    expect(screen.queryByText("Access Tokens")).not.toBeInTheDocument();
    expect(screen.queryByText("Roles")).not.toBeInTheDocument();
    expect(screen.queryByText("Permissions")).not.toBeInTheDocument();
  });

  it("shows Media Library and Users when the caller only holds the :manager equivalent, not the :read permission", () => {
    mockUseAuth.mockReturnValue({
      role: "super_admin",
      permissions: ["media:manager", "user:manager", "user:role_manager"],
      token: "x",
      userId: "1",
      loading: false,
      login: vi.fn(),
      logout: vi.fn(),
    });
    renderSidebar();

    expect(screen.getByText("Media Library")).toBeInTheDocument();
    expect(screen.getByText("Users")).toBeInTheDocument();
  });

  it("shows the Roles link only when role:manager is granted, independent of permission:manager", () => {
    mockUseAuth.mockReturnValue({ role: "role_manager_only", permissions: ["role:manager"], token: "x", userId: "1", loading: false, login: vi.fn(), logout: vi.fn() });
    renderSidebar();

    expect(screen.getByText("Roles")).toBeInTheDocument();
    expect(screen.queryByText("Permissions")).not.toBeInTheDocument();
  });

  it("shows every settings link for a role with all 5 permissions", () => {
    renderSidebar();

    expect(screen.getByText("Media Library")).toBeInTheDocument();
    expect(screen.getByText("Users")).toBeInTheDocument();
    expect(screen.getByText("Access Tokens")).toBeInTheDocument();
    expect(screen.getByText("Roles")).toBeInTheDocument();
    expect(screen.getByText("Permissions")).toBeInTheDocument();
  });
});

function setupMobile() {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: query === "(max-width: 1023px)",
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
}

function MobileOpenSetter({ open }: { open: boolean }) {
  const { setMobileOpen } = useSidebar();
  React.useEffect(() => {
    setMobileOpen(open);
  }, [open, setMobileOpen]);
  return null;
}

describe("Sidebar mobile overlay", () => {
  it("sidebar is hidden when mobile and mobileOpen=false", () => {
    setupMobile();
    render(
      <MemoryRouter>
        <SidebarProvider>
          <SidebarShell />
        </SidebarProvider>
      </MemoryRouter>,
    );
    const sidebar = screen.getByRole("complementary", { hidden: true });
    expect(sidebar.className).toContain("hidden");
  });

  it("renders backdrop when mobile and mobileOpen=true", () => {
    setupMobile();
    render(
      <MemoryRouter>
        <SidebarProvider>
          <MobileOpenSetter open={true} />
          <SidebarShell />
        </SidebarProvider>
      </MemoryRouter>,
    );
    expect(screen.getByTestId("sidebar-backdrop")).toBeInTheDocument();
  });

  it("clicking backdrop closes mobile sidebar", async () => {
    setupMobile();
    render(
      <MemoryRouter>
        <SidebarProvider>
          <MobileOpenSetter open={true} />
          <SidebarShell />
        </SidebarProvider>
      </MemoryRouter>,
    );
    const backdrop = screen.getByTestId("sidebar-backdrop");
    await userEvent.click(backdrop);
    const sidebar = screen.getByRole("complementary", { hidden: true });
    expect(sidebar.className).toContain("hidden");
  });
});
