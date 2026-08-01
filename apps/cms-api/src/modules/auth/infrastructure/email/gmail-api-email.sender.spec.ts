import { ConfigService } from "@nestjs/config";

import { type EnvironmentVariables } from "@/config/env.validation";

import { GmailApiEmailSender } from "./gmail-api-email.sender";
import { IEmailTemplateRenderer } from "./renderers/email-template-renderer";

describe("GmailApiEmailSender", () => {
  const fetchMock = jest.fn<Promise<Response>, [string, RequestInit]>();

  const templateRenderer: IEmailTemplateRenderer = {
    renderOtpEmail: ({ otp }) => `<p>otp:${otp}</p>`,
    renderPasswordResetEmail: ({ resetUrl }) => `<a href="${resetUrl}">reset</a>`,
  };

  const config = {
    get: jest.fn((key: string) => {
      const values: Record<string, unknown> = {
        GMAIL_CLIENT_ID: "client-id",
        GMAIL_CLIENT_SECRET: "client-secret",
        GMAIL_REFRESH_TOKEN: "refresh-token",
        GMAIL_SENDER_EMAIL: "sender@example.com",
        FRONTEND_URL: "https://abyssoftime.com",
      };
      return values[key];
    }),
  } as unknown as ConfigService<EnvironmentVariables, true>;

  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = fetchMock as unknown as typeof fetch;
  });

  function mockTokenThenSend(): void {
    fetchMock.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ access_token: "access-token" }) } as Response).mockResolvedValueOnce({ ok: true } as Response);
  }

  it("refreshes an access token then sends the OTP email via the Gmail API", async () => {
    mockTokenThenSend();
    const sender = new GmailApiEmailSender(config, templateRenderer);

    await sender.sendOtpEmail({ email: "target@example.com", otp: "654321" });

    expect(fetchMock).toHaveBeenCalledTimes(2);
    const [tokenUrl] = fetchMock.mock.calls[0];
    expect(tokenUrl).toBe("https://oauth2.googleapis.com/token");

    const [sendUrl, sendInit] = fetchMock.mock.calls[1];
    expect(sendUrl).toBe("https://gmail.googleapis.com/gmail/v1/users/me/messages/send");
    expect(sendInit.headers).toMatchObject({ Authorization: "Bearer access-token" });

    const body = JSON.parse(sendInit.body as string) as { raw: string };
    const decoded = Buffer.from(body.raw, "base64url").toString("utf-8");
    expect(decoded).toContain("From: sender@example.com");
    expect(decoded).toContain("To: target@example.com");
    expect(decoded).toContain("<p>otp:654321</p>");
  });

  it("sends the password-reset email via the Gmail API", async () => {
    mockTokenThenSend();
    const sender = new GmailApiEmailSender(config, templateRenderer);

    await sender.sendPasswordResetEmail({ email: "target@example.com", resetToken: "reset-abc" });

    const [, sendInit] = fetchMock.mock.calls[1];
    const body = JSON.parse(sendInit.body as string) as { raw: string };
    const decoded = Buffer.from(body.raw, "base64url").toString("utf-8");
    expect(decoded).toContain('<a href="https://abyssoftime.com/reset-password?token=reset-abc">reset</a>');
  });

  it("throws when the token refresh fails", async () => {
    fetchMock.mockResolvedValueOnce({ ok: false, status: 400, text: () => Promise.resolve("invalid_grant") } as Response);
    const sender = new GmailApiEmailSender(config, templateRenderer);

    await expect(sender.sendOtpEmail({ email: "target@example.com", otp: "654321" })).rejects.toThrow("Gmail OAuth2 token refresh failed");
  });

  it("throws when the Gmail send call fails", async () => {
    fetchMock
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ access_token: "access-token" }) } as Response)
      .mockResolvedValueOnce({ ok: false, status: 403, text: () => Promise.resolve("forbidden") } as Response);
    const sender = new GmailApiEmailSender(config, templateRenderer);

    await expect(sender.sendOtpEmail({ email: "target@example.com", otp: "654321" })).rejects.toThrow("Gmail API send failed");
  });
});
