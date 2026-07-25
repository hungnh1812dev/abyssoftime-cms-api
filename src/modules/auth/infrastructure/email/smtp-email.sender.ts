import { IEmailSender, SendOtpEmailParams, SendPasswordResetEmailParams } from "../../domain/ports/email-sender.port";

import { buildOtpEmailHtml } from "./templates/otp-email.template";
import { buildResetPasswordEmailHtml } from "./templates/reset-password-email.template";

import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import * as nodemailer from "nodemailer";

import { type EnvironmentVariables } from "@/config/env.validation";

@Injectable()
export class SmtpEmailSender implements IEmailSender {
  private readonly transporter: nodemailer.Transporter;
  private readonly from: string;
  private readonly frontendUrl: string;

  constructor(configService: ConfigService<EnvironmentVariables, true>) {
    this.from = configService.get("EMAIL_FROM", { infer: true });
    this.frontendUrl = configService.get("FRONTEND_URL", { infer: true });

    this.transporter = nodemailer.createTransport({
      host: configService.get("SMTP_HOST", { infer: true }),
      port: configService.get("SMTP_PORT", { infer: true }),
      secure: configService.get("SMTP_SECURE", { infer: true }),
      auth: {
        user: configService.get("SMTP_USER", { infer: true }),
        pass: configService.get("SMTP_PASSWORD", { infer: true }),
      },
    });
  }

  async sendOtpEmail({ email, otp }: SendOtpEmailParams): Promise<void> {
    await this.transporter.sendMail({
      to: email,
      from: this.from,
      subject: "Verify your email",
      html: buildOtpEmailHtml({ otp }),
    });
  }

  async sendPasswordResetEmail({ email, resetToken }: SendPasswordResetEmailParams): Promise<void> {
    const resetUrl = `${this.frontendUrl}/reset-password?token=${resetToken}`;

    await this.transporter.sendMail({
      to: email,
      from: this.from,
      subject: "Reset your password",
      html: buildResetPasswordEmailHtml({ resetUrl }),
    });
  }
}
