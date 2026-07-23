export interface SendOtpEmailParams {
  email: string;
  otp: string;
}

export interface SendPasswordResetEmailParams {
  email: string;
  resetToken: string;
}

export interface IEmailSender {
  sendOtpEmail(params: SendOtpEmailParams): Promise<void>;
  sendPasswordResetEmail(params: SendPasswordResetEmailParams): Promise<void>;
}

export const EMAIL_SENDER = Symbol("EMAIL_SENDER");
