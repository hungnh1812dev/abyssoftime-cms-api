import { MailerService } from "@nestjs-modules/mailer";

import { ConfigService } from "@nestjs/config";

import { type EnvironmentVariables } from "@/config/env.validation";

import { ConsoleEmailSender } from "./console-email.sender";
import { IEmailTemplateRenderer } from "./renderers/email-template-renderer";
import { resolveEmailSender } from "./resolve-email-sender";
import { SmtpEmailSender } from "./smtp-email.sender";

describe("resolveEmailSender", () => {
  const mailerService = {} as unknown as MailerService;
  const templateRenderer = {} as unknown as IEmailTemplateRenderer;

  function makeConfig(smtpHost: string): ConfigService<EnvironmentVariables, true> {
    return {
      get: jest.fn((key: string) => {
        const values: Record<string, unknown> = {
          SMTP_HOST: smtpHost,
          SMTP_PORT: 587,
          SMTP_USER: "",
          SMTP_PASSWORD: "",
          SMTP_SECURE: false,
          EMAIL_FROM: "no-reply@abyssoftime.com",
          FRONTEND_URL: "https://abyssoftime.com",
        };
        return values[key];
      }),
    } as unknown as ConfigService<EnvironmentVariables, true>;
  }

  it("returns a SmtpEmailSender when SMTP_HOST is set", () => {
    const sender = resolveEmailSender(makeConfig("smtp.example.com"), mailerService, templateRenderer);

    expect(sender).toBeInstanceOf(SmtpEmailSender);
  });

  it("returns a ConsoleEmailSender when SMTP_HOST is empty", () => {
    const sender = resolveEmailSender(makeConfig(""), mailerService, templateRenderer);

    expect(sender).toBeInstanceOf(ConsoleEmailSender);
  });
});
