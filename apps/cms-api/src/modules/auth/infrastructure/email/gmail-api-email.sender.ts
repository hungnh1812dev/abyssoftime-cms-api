import { IEmailSender, SendOtpEmailParams, SendPasswordResetEmailParams } from "../../domain/ports/email-sender.port";

import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

import { type EnvironmentVariables } from "@/config/env.validation";

import { type IEmailTemplateRenderer } from "./renderers/email-template-renderer";

interface RawMimeMessage {
  from: string;
  to: string;
  subject: string;
  html: string;
}

function encodeMimeMessage({ from, to, subject, html }: RawMimeMessage): string {
  const message = [
    `From: ${from}`,
    `To: ${to}`,
    `Subject: =?UTF-8?B?${Buffer.from(subject, "utf-8").toString("base64")}?=`,
    "MIME-Version: 1.0",
    'Content-Type: text/html; charset="UTF-8"',
    "",
    html,
  ].join("\r\n");

  return Buffer.from(message, "utf-8").toString("base64url");
}

@Injectable()
export class GmailApiEmailSender implements IEmailSender {
  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly refreshToken: string;
  private readonly senderEmail: string;
  private readonly frontendUrl: string;

  constructor(
    configService: ConfigService<EnvironmentVariables, true>,
    private readonly templateRenderer: IEmailTemplateRenderer,
  ) {
    this.clientId = configService.get("GMAIL_CLIENT_ID", { infer: true });
    this.clientSecret = configService.get("GMAIL_CLIENT_SECRET", { infer: true });
    this.refreshToken = configService.get("GMAIL_REFRESH_TOKEN", { infer: true });
    this.senderEmail = configService.get("GMAIL_SENDER_EMAIL", { infer: true });
    this.frontendUrl = configService.get("FRONTEND_URL", { infer: true });
  }

  async sendOtpEmail({ email, otp }: SendOtpEmailParams): Promise<void> {
    await this.send(email, "Verify your email", this.templateRenderer.renderOtpEmail({ otp }));
  }

  async sendPasswordResetEmail({ email, resetToken }: SendPasswordResetEmailParams): Promise<void> {
    const resetUrl = `${this.frontendUrl}/reset-password?token=${resetToken}`;

    await this.send(email, "Reset your password", this.templateRenderer.renderPasswordResetEmail({ resetUrl }));
  }

  private async send(to: string, subject: string, html: string): Promise<void> {
    const accessToken = await this.getAccessToken();
    const raw = encodeMimeMessage({ from: this.senderEmail, to, subject, html });

    const response = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ raw }),
    });

    if (!response.ok) {
      throw new Error(`Gmail API send failed (${response.status}): ${await response.text()}`);
    }
  }

  private async getAccessToken(): Promise<string> {
    const response = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: this.clientId,
        client_secret: this.clientSecret,
        refresh_token: this.refreshToken,
        grant_type: "refresh_token",
      }),
    });

    if (!response.ok) {
      throw new Error(`Gmail OAuth2 token refresh failed (${response.status}): ${await response.text()}`);
    }

    const data = (await response.json()) as { access_token: string };
    return data.access_token;
  }
}
