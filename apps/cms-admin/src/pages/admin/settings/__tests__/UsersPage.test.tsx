import { UsersPage } from "../UsersPage";
import { screen, waitFor } from "@testing-library/react";
import MockAdapter from "axios-mock-adapter";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { api } from "@/lib/api";
import { renderWithProviders } from "@/test-utils";

const mockUseAuth = vi.fn();
vi.mock("@/context/AuthContext", () => ({
  useAuth: () => mockUseAuth(),
}));

let mock: MockAdapter;

const emptyInviteList = { items: [] };
const usersResponse = {
  items: [
    { id: "u1", email: "alice@example.com", displayName: "Alice Admin", role: "super_admin" },
    { id: "u2", email: "bob@example.com", displayName: "Bob Editor", role: "editor" },
  ],
  total: 2,
  page: 1,
  limit: 20,
};
const rolesResponse = [
  { documentId: "r1", name: "Super Admin", slug: "super_admin", permissions: [], level: 100, isDefault: true },
  { documentId: "r2", name: "Editor", slug: "editor", permissions: [], level: 60, isDefault: true },
];

beforeEach(() => {
  mockUseAuth.mockReturnValue({ role: "super_admin", permissions: [], token: "x", userId: "u1", loading: false, login: vi.fn(), logout: vi.fn() });
  mock = new MockAdapter(api);
  mock.onGet("/api/users?page=1&limit=20").reply(200, usersResponse);
  mock.onGet("/api/invites").reply(200, emptyInviteList);
  mock.onGet("/api/roles").reply(200, rolesResponse);
});

afterEach(() => {
  mock.restore();
  vi.clearAllMocks();
});

describe("UsersPage — Display Name column", () => {
  it("renders a Display Name column header", async () => {
    renderWithProviders(<UsersPage />);
    await waitFor(() => expect(screen.getByText("Display Name")).toBeInTheDocument());
  });

  it("renders each user’s display name in its row", async () => {
    renderWithProviders(<UsersPage />);
    await waitFor(() => {
      expect(screen.getByText("Alice Admin")).toBeInTheDocument();
      expect(screen.getByText("Bob Editor")).toBeInTheDocument();
    });
  });
});

describe("UsersPage — Role column shows the role name, not the slug", () => {
  it("renders the role name for each user", async () => {
    renderWithProviders(<UsersPage />);
    await waitFor(() => {
      expect(screen.getByText("Super Admin")).toBeInTheDocument();
      expect(screen.getByText("Editor")).toBeInTheDocument();
    });
  });

  it("does not render the raw role slug", async () => {
    renderWithProviders(<UsersPage />);
    await waitFor(() => expect(screen.getByText("Super Admin")).toBeInTheDocument());
    expect(screen.queryByText("super_admin")).not.toBeInTheDocument();
  });
});
