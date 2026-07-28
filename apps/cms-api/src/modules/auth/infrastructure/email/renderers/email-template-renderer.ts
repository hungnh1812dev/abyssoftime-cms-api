export interface RenderOtpEmailParams {
  otp: string;
}

export interface RenderPasswordResetEmailParams {
  resetUrl: string;
}

export interface IEmailTemplateRenderer {
  renderOtpEmail(params: RenderOtpEmailParams): string;
  renderPasswordResetEmail(params: RenderPasswordResetEmailParams): string;
}

export const EMAIL_TEMPLATE_RENDERER = Symbol("EMAIL_TEMPLATE_RENDERER");
