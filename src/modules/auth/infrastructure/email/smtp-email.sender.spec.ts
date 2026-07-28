import { MailerService } from "@nestjs-modules/mailer";

import { ConfigService } from "@nestjs/config";

import { type EnvironmentVariables } from "@/config/env.validation";

import { IEmailTemplateRenderer } from "./renderers/email-template-renderer";
import { SmtpEmailSender } from "./smtp-email.sender";

interface SentMail {
  to: string;
  subject: string;
  html: string;
}

describe("SmtpEmailSender", () => {
  const sendMail = jest.fn<Promise<void>, [SentMail]>();
  const mailerService = { sendMail } as unknown as MailerService;

  const templateRenderer: IEmailTemplateRenderer = {
    renderOtpEmail: ({ otp }) => `<p>otp:${otp}</p>`,
    renderPasswordResetEmail: ({ resetUrl }) => `<a href="${resetUrl}">reset</a>`,
  };

  const config = {
    get: jest.fn((key: string) => {
      const values: Record<string, unknown> = {
        FRONTEND_URL: "https://abyssoftime.com",
      };
      return values[key];
    }),
  } as unknown as ConfigService<EnvironmentVariables, true>;

  beforeEach(() => {
    jest.clearAllMocks();
    sendMail.mockResolvedValue(undefined);
  });

  it("sends the OTP email rendered via the injected template renderer", async () => {
    const sender = new SmtpEmailSender(config, mailerService, templateRenderer);

    await sender.sendOtpEmail({ email: "target@example.com", otp: "654321" });

    expect(sendMail).toHaveBeenCalledTimes(1);
    const call = sendMail.mock.calls[0][0];
    expect(call.to).toBe("target@example.com");
    expect(call.subject).toMatch(/verif/i);
    expect(call.html).toBe("<p>otp:654321</p>");
  });

  it("sends the password-reset email rendered via the injected template renderer", async () => {
    const sender = new SmtpEmailSender(config, mailerService, templateRenderer);

    await sender.sendPasswordResetEmail({ email: "target@example.com", resetToken: "reset-abc" });

    expect(sendMail).toHaveBeenCalledTimes(1);
    const call = sendMail.mock.calls[0][0];
    expect(call.to).toBe("target@example.com");
    expect(call.subject).toMatch(/reset/i);
    expect(call.html).toBe('<a href="https://abyssoftime.com/reset-password?token=reset-abc">reset</a>');
  });
});
