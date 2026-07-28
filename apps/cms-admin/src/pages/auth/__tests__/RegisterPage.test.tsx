import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import MockAdapter from "axios-mock-adapter";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { api } from "@/lib/api";
import { RegisterPage } from "@/pages/auth/RegisterPage";
import { renderWithProviders } from "@/test-utils";

let mock: MockAdapter;

beforeEach(() => {
  mock = new MockAdapter(api);
  mock.onGet("/auth/has-users").reply(200, { hasUsers: false });
});

afterEach(() => {
  mock.restore();
  vi.clearAllMocks();
});

async function fillValidForm(user: ReturnType<typeof userEvent.setup>) {
  await user.type(await screen.findByLabelText(/display name/i), "Test User");
  await user.type(screen.getByLabelText(/username/i), "testuser");
  await user.type(screen.getByLabelText(/email/i), "newuser@example.com");
  await user.type(screen.getByLabelText(/password/i), "securepass1");
}

describe("RegisterPage", () => {
  it("renders display name, username, email and password fields with a submit button", async () => {
    renderWithProviders(<RegisterPage />);
    expect(await screen.findByLabelText(/display name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/username/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /create admin account/i })).toBeInTheDocument();
  });

  it("shows validation error for invalid email", async () => {
    const user = userEvent.setup();
    renderWithProviders(<RegisterPage />);

    await fillValidForm(user);
    await user.clear(screen.getByLabelText(/email/i));
    await user.type(screen.getByLabelText(/email/i), "bad-email");
    await user.click(screen.getByRole("button", { name: /create admin account/i }));

    await waitFor(() => {
      expect(screen.getByText(/valid email/i)).toBeInTheDocument();
    });
  });

  it("shows validation error for an invalid username", async () => {
    const user = userEvent.setup();
    renderWithProviders(<RegisterPage />);

    await fillValidForm(user);
    await user.clear(screen.getByLabelText(/username/i));
    await user.type(screen.getByLabelText(/username/i), "no spaces allowed");
    await user.click(screen.getByRole("button", { name: /create admin account/i }));

    await waitFor(() => {
      expect(screen.getByText(/letters, numbers, underscore/i)).toBeInTheDocument();
    });
  });

  it("shows validation error for password shorter than 8 characters", async () => {
    const user = userEvent.setup();
    renderWithProviders(<RegisterPage />);

    await fillValidForm(user);
    await user.clear(screen.getByLabelText(/password/i));
    await user.type(screen.getByLabelText(/password/i), "short");
    await user.click(screen.getByRole("button", { name: /create admin account/i }));

    await waitFor(() => {
      expect(screen.getByText(/at least 8/i)).toBeInTheDocument();
    });
  });

  it("calls POST /auth/register with accountType on valid submit and navigates to /verify-otp", async () => {
    const user = userEvent.setup();
    let capturedBody: unknown;
    mock.onPost("/auth/register").reply((config) => {
      capturedBody = JSON.parse(config.data);
      return [201, { message: "Registration successful. Check your email for the verification code." }];
    });
    renderWithProviders(<RegisterPage />);

    await fillValidForm(user);
    await user.click(screen.getByRole("button", { name: /create admin account/i }));

    await waitFor(() => {
      expect(capturedBody).toEqual({
        name: "Test User",
        username: "testuser",
        email: "newuser@example.com",
        password: "securepass1",
        accountType: true,
      });
    });
  });

  it("redirects to /login when users already exist", async () => {
    mock.onGet("/auth/has-users").reply(200, { hasUsers: true });
    renderWithProviders(<RegisterPage />);

    await waitFor(() => {
      expect(screen.queryByLabelText(/email/i)).not.toBeInTheDocument();
    });
  });

  it("shows error message when registration fails", async () => {
    const user = userEvent.setup();
    mock.onPost("/auth/register").reply(409, { message: "Email already exists" });
    renderWithProviders(<RegisterPage />);

    await fillValidForm(user);
    await user.click(screen.getByRole("button", { name: /create admin account/i }));

    await waitFor(() => {
      expect(screen.getByRole("alert")).toBeInTheDocument();
    });
  });
});
