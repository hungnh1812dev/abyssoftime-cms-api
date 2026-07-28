import { buildOtpEmailHtml } from "../templates/otp-email.template";
import { buildResetPasswordEmailHtml } from "../templates/reset-password-email.template";

import { Injectable } from "@nestjs/common";

import { IEmailTemplateRenderer, RenderOtpEmailParams, RenderPasswordResetEmailParams } from "./email-template-renderer";

@Injectable()
export class TsEmailTemplateRenderer implements IEmailTemplateRenderer {
  renderOtpEmail(params: RenderOtpEmailParams): string {
    return buildOtpEmailHtml(params);
  }

  renderPasswordResetEmail(params: RenderPasswordResetEmailParams): string {
    return buildResetPasswordEmailHtml(params);
  }
}
