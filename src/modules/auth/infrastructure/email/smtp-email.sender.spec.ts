import * as nodemailer from "nodemailer";

import { ConfigService } from "@nestjs/config";

import { type EnvironmentVariables } from "@/config/env.validation";

import { SmtpEmailSender } from "./smtp-email.sender";

jest.mock("nodemailer");

interface SentMail {
  to: string;
  from: string;
  subject: string;
  html: string;
}

describe("SmtpEmailSender", () => {
  const sendMail = jest.fn<Promise<void>, [SentMail]>();
  const createTransport = nodemailer.createTransport as jest.Mock;

  const config = {
    get: jest.fn((key: string) => {
      const values: Record<string, unknown> = {
        SMTP_HOST: "smtp.example.com",
        SMTP_PORT: 587,
        SMTP_USER: "user@example.com",
        SMTP_PASSWORD: "hunter2",
        SMTP_SECURE: false,
        EMAIL_FROM: "no-reply@abyssoftime.com",
        FRONTEND_URL: "https://abyssoftime.com",
      };
      return values[key];
    }),
  } as unknown as ConfigService<EnvironmentVariables, true>;

  beforeEach(() => {
    jest.clearAllMocks();
    sendMail.mockResolvedValue(undefined);
    createTransport.mockReturnValue({ sendMail });
  });

  it("builds a nodemailer transport from SMTP config on construction", () => {
    new SmtpEmailSender(config);

    expect(createTransport).toHaveBeenCalledWith({
      host: "smtp.example.com",
      port: 587,
      secure: false,
      requireTLS: true,
      auth: { user: "user@example.com", pass: "hunter2" },
    });
  });

  it("sends the OTP email with the OTP template and correct envelope", async () => {
    const sender = new SmtpEmailSender(config);

    await sender.sendOtpEmail({ email: "target@example.com", otp: "654321" });

    expect(sendMail).toHaveBeenCalledTimes(1);
    const call = sendMail.mock.calls[0][0];
    expect(call.to).toBe("target@example.com");
    expect(call.from).toBe("no-reply@abyssoftime.com");
    expect(call.subject).toMatch(/verif/i);
    expect(call.html).toContain("654321");
  });

  it("sends the password-reset email with the reset template and correct envelope", async () => {
    const sender = new SmtpEmailSender(config);

    await sender.sendPasswordResetEmail({ email: "target@example.com", resetToken: "reset-abc" });

    expect(sendMail).toHaveBeenCalledTimes(1);
    const call = sendMail.mock.calls[0][0];
    expect(call.to).toBe("target@example.com");
    expect(call.from).toBe("no-reply@abyssoftime.com");
    expect(call.subject).toMatch(/reset/i);
    expect(call.html).toContain("reset-abc");
    expect(call.html).toContain("https://abyssoftime.com");
  });
});
