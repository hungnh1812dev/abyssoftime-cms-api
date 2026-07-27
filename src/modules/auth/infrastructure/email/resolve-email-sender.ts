import { IEmailSender } from "../../domain/ports/email-sender.port";

import { ConfigService } from "@nestjs/config";

import { type EnvironmentVariables } from "@/config/env.validation";

import { ConsoleEmailSender } from "./console-email.sender";
import { SmtpEmailSender } from "./smtp-email.sender";

export function resolveEmailSender(configService: ConfigService<EnvironmentVariables, true>): IEmailSender {
  const smtpHost = configService.get("SMTP_HOST", { infer: true });

  return smtpHost ? new SmtpEmailSender(configService) : new ConsoleEmailSender();
}
