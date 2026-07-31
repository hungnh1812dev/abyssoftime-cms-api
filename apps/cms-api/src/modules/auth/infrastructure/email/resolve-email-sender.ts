import { IEmailSender } from "../../domain/ports/email-sender.port";
import { MailerService } from "@nestjs-modules/mailer";

import { ConfigService } from "@nestjs/config";

import { type EnvironmentVariables } from "@/config/env.validation";

import { ConsoleEmailSender } from "./console-email.sender";
import { IEmailTemplateRenderer } from "./renderers/email-template-renderer";
import { SmtpEmailSender } from "./smtp-email.sender";

export function resolveEmailSender(configService: ConfigService<EnvironmentVariables, true>, mailerService: MailerService, templateRenderer: IEmailTemplateRenderer): IEmailSender {
  const smtpHost = configService.get("SMTP_HOST", { infer: true });

  return smtpHost ? new SmtpEmailSender(configService, mailerService, templateRenderer) : new ConsoleEmailSender();
}
