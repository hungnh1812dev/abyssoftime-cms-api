import { act, screen, waitFor } from "@testing-library/react";
import MockAdapter from "axios-mock-adapter";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { AuthProvider, MOUNT_REFRESH_RETRY_DELAYS_MS, useAuth } from "@/context/AuthContext";
import { api, getAccessToken, setAccessToken } from "@/lib/api";
import { renderWithProviders } from "@/test-utils";

/** Builds a structurally valid JWT whose payload can be decoded client-side. */
function makeToken(payload: Record<string, unknown>) {
  const header = btoa(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const body = btoa(JSON.stringify(payload));
  return `${header}.${body}.fakesig`;
}

const ADMIN_TOKEN = makeToken({ userId: "u1", role: "admin", exp: 9999999999 });
const GUEST_TOKEN = makeToken({ userId: "u2", role: "guest", exp: 9999999999 });

let mock: MockAdapter;

// The retry delays are sized (seconds) to ride out a real cold start, which
// would make these tests slow. Shrink them in place for the test run — the
// array is exported as a mutable module binding for exactly this purpose.
const PROD_RETRY_DELAYS_MS = [...MOUNT_REFRESH_RETRY_DELAYS_MS];

beforeEach(() => {
  mock = new MockAdapter(api);
  setAccessToken(null);
  MOUNT_REFRESH_RETRY_DELAYS_MS.splice(0, MOUNT_REFRESH_RETRY_DELAYS_MS.length, 5, 5, 5);
});

afterEach(() => {
  mock.restore();
  vi.clearAllMocks();
  MOUNT_REFRESH_RETRY_DELAYS_MS.splice(0, MOUNT_REFRESH_RETRY_DELAYS_MS.length, ...PROD_RETRY_DELAYS_MS);
});

// Helper component to inspect auth context values
function AuthDisplay() {
  const { token, role, userId, permissions, loading } = useAuth();
  if (loading) return <span data-testid="loading">loading</span>;
  return (
    <div>
      <span data-testid="token">{token ?? "none"}</span>
      <span data-testid="role">{role ?? "none"}</span>
      <span data-testid="userId">{userId ?? "none"}</span>
      <span data-testid="permissions">{permissions.length > 0 ? permissions.join(",") : "none"}</span>
    </div>
  );
}

describe("AuthProvider", () => {
  it("resolves as unauthenticated when the mount-time cookie refresh fails", async () => {
    mock.onPost("/auth/refresh").reply(401);

    renderWithProviders(
      <AuthProvider>
        <AuthDisplay />
      </AuthProvider>,
    );

    await waitFor(() => expect(screen.getByTestId("token")).toHaveTextContent("none"));
    expect(screen.getByTestId("role")).toHaveTextContent("none");
  });

  it("starts in loading state then resolves once the mount-time refresh settles", async () => {
    mock.onPost("/auth/refresh").reply(401);

    renderWithProviders(
      <AuthProvider>
        <AuthDisplay />
      </AuthProvider>,
    );

    expect(screen.getByTestId("loading")).toBeInTheDocument();
    await waitFor(() => expect(screen.getByTestId("token")).toHaveTextContent("none"));
    expect(screen.getByTestId("role")).toHaveTextContent("none");
  });

  it("retries a transient mount-time refresh failure (e.g. a cold-start 503) and hydrates once it succeeds", async () => {
    let callCount = 0;
    mock.onPost("/auth/refresh").reply(() => {
      callCount += 1;
      return callCount === 1 ? [503] : [200, { accessToken: ADMIN_TOKEN }];
    });

    renderWithProviders(
      <AuthProvider>
        <AuthDisplay />
      </AuthProvider>,
    );

    await waitFor(() => expect(screen.getByTestId("role")).toHaveTextContent("admin"));
    expect(callCount).toBe(2);
  });

  it("gives up and logs out only after exhausting retries on a persistent transient failure", async () => {
    let callCount = 0;
    mock.onPost("/auth/refresh").reply(() => {
      callCount += 1;
      return [503];
    });

    renderWithProviders(
      <AuthProvider>
        <AuthDisplay />
      </AuthProvider>,
    );

    await waitFor(() => expect(screen.getByTestId("token")).toHaveTextContent("none"));
    expect(callCount).toBe(MOUNT_REFRESH_RETRY_DELAYS_MS.length + 1);
  });

  it("hydrates token + role from a valid session cookie on mount", async () => {
    mock.onPost("/auth/refresh").reply(200, { accessToken: ADMIN_TOKEN });

    renderWithProviders(
      <AuthProvider>
        <AuthDisplay />
      </AuthProvider>,
    );

    await waitFor(() => expect(screen.getByTestId("role")).toHaveTextContent("admin"));
    expect(screen.getByTestId("userId")).toHaveTextContent("u1");
    expect(getAccessToken()).toBe(ADMIN_TOKEN);
  });

  it("login() updates context and sets the in-memory access token", async () => {
    mock.onPost("/auth/refresh").reply(401);

    function LoginTrigger() {
      const { login, token } = useAuth();
      return (
        <div>
          <span data-testid="token">{token ?? "none"}</span>
          <button onClick={() => login(ADMIN_TOKEN)}>login</button>
        </div>
      );
    }

    const { getByRole } = renderWithProviders(
      <AuthProvider>
        <LoginTrigger />
      </AuthProvider>,
    );

    await waitFor(() => expect(screen.queryByTestId("loading")).not.toBeInTheDocument());
    await act(async () => getByRole("button", { name: "login" }).click());

    expect(screen.getByTestId("token")).toHaveTextContent(ADMIN_TOKEN);
    expect(getAccessToken()).toBe(ADMIN_TOKEN);
  });

  it("logout() clears context and calls POST /auth/logout", async () => {
    mock.onPost("/auth/refresh").reply(200, { accessToken: ADMIN_TOKEN });
    let logoutCalled = false;
    mock.onPost("/auth/logout").reply(() => {
      logoutCalled = true;
      return [200, {}];
    });

    function LogoutTrigger() {
      const { logout, token } = useAuth();
      return (
        <div>
          <span data-testid="token">{token ?? "none"}</span>
          <button onClick={() => logout()}>logout</button>
        </div>
      );
    }

    const { getByRole } = renderWithProviders(
      <AuthProvider>
        <LogoutTrigger />
      </AuthProvider>,
    );

    await waitFor(() => expect(screen.getByTestId("token")).not.toHaveTextContent("none"));
    await act(async () => getByRole("button", { name: "logout" }).click());

    await waitFor(() => expect(screen.getByTestId("token")).toHaveTextContent("none"));
    expect(logoutCalled).toBe(true);
    expect(getAccessToken()).toBeNull();
  });
});

describe("AuthProvider — permissions (CATALOG-T10)", () => {
  it("populates permissions from GET /auth/me after a successful mount-time refresh", async () => {
    mock.onPost("/auth/refresh").reply(200, { accessToken: ADMIN_TOKEN });
    mock.onGet("/auth/me").reply(200, { role: "admin", permissions: ["document:read", "document:create"] });

    renderWithProviders(
      <AuthProvider>
        <AuthDisplay />
      </AuthProvider>,
    );

    await waitFor(() => expect(screen.getByTestId("role")).toHaveTextContent("admin"));
    await waitFor(() => expect(screen.getByTestId("permissions")).toHaveTextContent("document:read,document:create"));
  });

  it("populates permissions after login()", async () => {
    mock.onPost("/auth/refresh").reply(401);
    mock.onGet("/auth/me").reply(200, { role: "admin", permissions: ["users:read"] });

    function LoginTrigger() {
      const { login, permissions } = useAuth();
      return (
        <div>
          <span data-testid="permissions">{permissions.length > 0 ? permissions.join(",") : "none"}</span>
          <button onClick={() => login(ADMIN_TOKEN)}>login</button>
        </div>
      );
    }

    const { getByRole } = renderWithProviders(
      <AuthProvider>
        <LoginTrigger />
      </AuthProvider>,
    );

    await waitFor(() => expect(screen.queryByTestId("loading")).not.toBeInTheDocument());
    await act(async () => getByRole("button", { name: "login" }).click());

    await waitFor(() => expect(screen.getByTestId("permissions")).toHaveTextContent("users:read"));
  });

  it("clears permissions on logout", async () => {
    mock.onPost("/auth/refresh").reply(200, { accessToken: ADMIN_TOKEN });
    mock.onGet("/auth/me").reply(200, { role: "admin", permissions: ["document:read"] });
    mock.onPost("/auth/logout").reply(200, {});

    function LogoutTrigger() {
      const { logout, permissions } = useAuth();
      return (
        <div>
          <span data-testid="permissions">{permissions.length > 0 ? permissions.join(",") : "none"}</span>
          <button onClick={() => logout()}>logout</button>
        </div>
      );
    }

    const { getByRole } = renderWithProviders(
      <AuthProvider>
        <LogoutTrigger />
      </AuthProvider>,
    );

    await waitFor(() => expect(screen.getByTestId("permissions")).toHaveTextContent("document:read"));
    await act(async () => getByRole("button", { name: "logout" }).click());

    await waitFor(() => expect(screen.getByTestId("permissions")).toHaveTextContent("none"));
  });

  it("does not crash the session when GET /auth/me fails — permissions just stay empty", async () => {
    mock.onPost("/auth/refresh").reply(200, { accessToken: ADMIN_TOKEN });
    mock.onGet("/auth/me").reply(500);

    renderWithProviders(
      <AuthProvider>
        <AuthDisplay />
      </AuthProvider>,
    );

    await waitFor(() => expect(screen.getByTestId("role")).toHaveTextContent("admin"));
    expect(screen.getByTestId("permissions")).toHaveTextContent("none");
    expect(screen.getByTestId("token")).toHaveTextContent(ADMIN_TOKEN);
  });
});

describe("useAuth (context access)", () => {
  it("provides correct role from token", async () => {
    mock.onPost("/auth/refresh").reply(200, { accessToken: GUEST_TOKEN });

    renderWithProviders(
      <AuthProvider>
        <AuthDisplay />
      </AuthProvider>,
    );

    await waitFor(() => expect(screen.getByTestId("role")).toHaveTextContent("guest"));
  });
});
