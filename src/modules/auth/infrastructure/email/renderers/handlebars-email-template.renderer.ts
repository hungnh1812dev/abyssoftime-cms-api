import { readFileSync } from "fs";
import * as Handlebars from "handlebars";
import { join } from "path";

import { Injectable } from "@nestjs/common";

import { IEmailTemplateRenderer, RenderOtpEmailParams, RenderPasswordResetEmailParams } from "./email-template-renderer";

const TEMPLATES_DIR = join(__dirname, "../templates/handlebars");

@Injectable()
export class HandlebarsEmailTemplateRenderer implements IEmailTemplateRenderer {
  private readonly otpTemplate = Handlebars.compile<RenderOtpEmailParams>(readFileSync(join(TEMPLATES_DIR, "otp-email.hbs"), "utf-8"));

  private readonly resetPasswordTemplate = Handlebars.compile<RenderPasswordResetEmailParams>(readFileSync(join(TEMPLATES_DIR, "reset-password-email.hbs"), "utf-8"));

  renderOtpEmail(params: RenderOtpEmailParams): string {
    return this.otpTemplate(params);
  }

  renderPasswordResetEmail(params: RenderPasswordResetEmailParams): string {
    return this.resetPasswordTemplate(params);
  }
}
