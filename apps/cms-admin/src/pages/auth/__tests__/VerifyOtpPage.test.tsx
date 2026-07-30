import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import MockAdapter from "axios-mock-adapter";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { api } from "@/lib/api";
import { VerifyOtpPage } from "@/pages/auth/VerifyOtpPage";
import { renderWithProviders } from "@/test-utils";

let mock: MockAdapter;

beforeEach(() => {
  mock = new MockAdapter(api);
});

afterEach(() => {
  mock.restore();
  vi.clearAllMocks();
});

function renderVerify(initialEntries = ["/verify-otp"]) {
  return renderWithProviders(
    <Routes>
      <Route path="/verify-otp" element={<VerifyOtpPage />} />
      <Route path="/login" element={<p>Login page</p>} />
    </Routes>,
    { initialEntries },
  );
}

describe("VerifyOtpPage", () => {
  it("renders email and OTP fields with verify/resend buttons", () => {
    renderVerify();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/verification code/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /verify email/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /resend code/i })).toBeInTheDocument();
  });

  it("pre-fills the email from router state", () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={[{ pathname: "/verify-otp", state: { email: "prefilled@example.com" } }]}>
          <Routes>
            <Route path="/verify-otp" element={<VerifyOtpPage />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    );
    expect(screen.getByLabelText(/email/i)).toHaveValue("prefilled@example.com");
  });

  it("shows validation error for a malformed OTP", async () => {
    const user = userEvent.setup();
    renderVerify();

    await user.type(screen.getByLabelText(/email/i), "user@example.com");
    await user.type(screen.getByLabelText(/verification code/i), "12");
    await user.click(screen.getByRole("button", { name: /verify email/i }));

    await waitFor(() => expect(screen.getByText(/^Enter the 6-digit code$/i)).toBeInTheDocument());
  });

  it("calls POST /auth/verify-otp and navigates to /login on success", async () => {
    const user = userEvent.setup();
    let capturedBody: unknown;
    mock.onPost("/auth/verify-otp").reply((config) => {
      capturedBody = JSON.parse(config.data);
      return [200, { message: "Email verified successfully." }];
    });
    renderVerify();

    await user.type(screen.getByLabelText(/email/i), "user@example.com");
    await user.type(screen.getByLabelText(/verification code/i), "123456");
    await user.click(screen.getByRole("button", { name: /verify email/i }));

    await waitFor(() => expect(screen.getByText("Login page")).toBeInTheDocument());
    expect(capturedBody).toEqual({ email: "user@example.com", otp: "123456" });
  });

  it("shows an error message when verification fails", async () => {
    const user = userEvent.setup();
    mock.onPost("/auth/verify-otp").reply(400, { message: "Invalid or expired code" });
    renderVerify();

    await user.type(screen.getByLabelText(/email/i), "user@example.com");
    await user.type(screen.getByLabelText(/verification code/i), "123456");
    await user.click(screen.getByRole("button", { name: /verify email/i }));

    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("Invalid or expired code"));
  });

  it("calls POST /auth/resend-otp when Resend code is clicked", async () => {
    const user = userEvent.setup();
    let resendBody: unknown;
    mock.onPost("/auth/resend-otp").reply((config) => {
      resendBody = JSON.parse(config.data);
      return [200, { message: "Code resent" }];
    });
    renderVerify();

    await user.type(screen.getByLabelText(/email/i), "user@example.com");
    await user.click(screen.getByRole("button", { name: /resend code/i }));

    await waitFor(() => expect(resendBody).toEqual({ email: "user@example.com" }));
  });
});
