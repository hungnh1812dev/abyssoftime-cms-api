import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import MockAdapter from "axios-mock-adapter";
import { Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { api } from "@/lib/api";
import { ResetPasswordPage } from "@/pages/auth/ResetPasswordPage";
import { renderWithProviders } from "@/test-utils";

let mock: MockAdapter;

beforeEach(() => {
  mock = new MockAdapter(api);
});

afterEach(() => {
  mock.restore();
  vi.clearAllMocks();
});

function renderReset(initialEntries = ["/reset-password?token=abc123"]) {
  return renderWithProviders(
    <Routes>
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      <Route path="/forgot-password" element={<p>Forgot password page</p>} />
      <Route path="/login" element={<p>Login page</p>} />
    </Routes>,
    { initialEntries },
  );
}

describe("ResetPasswordPage", () => {
  it("shows a link-expired state when no token is present in the URL", () => {
    renderReset(["/reset-password"]);
    expect(screen.getByText(/link expired/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /request a new link/i })).toHaveAttribute("href", "/forgot-password");
  });

  it("renders new-password and confirm-password fields when a token is present", () => {
    renderReset();
    expect(screen.getByLabelText(/new password/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/confirm password/i)).toBeInTheDocument();
  });

  it("shows a validation error when passwords don't match", async () => {
    const user = userEvent.setup();
    renderReset();

    await user.type(screen.getByLabelText(/^new password$/i), "password123");
    await user.type(screen.getByLabelText(/confirm password/i), "different123");
    await user.click(screen.getByRole("button", { name: /reset password/i }));

    await waitFor(() => expect(screen.getByText(/don't match/i)).toBeInTheDocument());
  });

  it("calls POST /auth/reset-password with the token from the URL and navigates to /login", async () => {
    const user = userEvent.setup();
    let capturedBody: unknown;
    mock.onPost("/auth/reset-password").reply((config) => {
      capturedBody = JSON.parse(config.data);
      return [200, { message: "Password reset" }];
    });
    renderReset();

    await user.type(screen.getByLabelText(/^new password$/i), "password123");
    await user.type(screen.getByLabelText(/confirm password/i), "password123");
    await user.click(screen.getByRole("button", { name: /reset password/i }));

    await waitFor(() => expect(screen.getByText("Login page")).toBeInTheDocument());
    expect(capturedBody).toEqual({ token: "abc123", newPassword: "password123" });
  });

  it("shows a link-expired state on a 400 (invalid/expired token)", async () => {
    const user = userEvent.setup();
    mock.onPost("/auth/reset-password").reply(400, { message: "Invalid or expired token" });
    renderReset();

    await user.type(screen.getByLabelText(/^new password$/i), "password123");
    await user.type(screen.getByLabelText(/confirm password/i), "password123");
    await user.click(screen.getByRole("button", { name: /reset password/i }));

    await waitFor(() => expect(screen.getByText(/link expired/i)).toBeInTheDocument());
  });
});
