import { IEmailSender, SendOtpEmailParams, SendPasswordResetEmailParams } from "../../domain/ports/email-sender.port";
import { MailerService } from "@nestjs-modules/mailer";

import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

import { type EnvironmentVariables } from "@/config/env.validation";

import { type IEmailTemplateRenderer } from "./renderers/email-template-renderer";

@Injectable()
export class SmtpEmailSender implements IEmailSender {
  private readonly frontendUrl: string;

  constructor(
    configService: ConfigService<EnvironmentVariables, true>,
    private readonly mailerService: MailerService,
    private readonly templateRenderer: IEmailTemplateRenderer,
  ) {
    this.frontendUrl = configService.get("FRONTEND_URL", { infer: true });
  }

  async sendOtpEmail({ email, otp }: SendOtpEmailParams): Promise<void> {
    await this.mailerService.sendMail({
      to: email,
      subject: "Verify your email",
      html: this.templateRenderer.renderOtpEmail({ otp }),
    });
  }

  async sendPasswordResetEmail({ email, resetToken }: SendPasswordResetEmailParams): Promise<void> {
    const resetUrl = `${this.frontendUrl}/reset-password?token=${resetToken}`;

    await this.mailerService.sendMail({
      to: email,
      subject: "Reset your password",
      html: this.templateRenderer.renderPasswordResetEmail({ resetUrl }),
    });
  }
}
