export interface SendOtpEmailParams {
  email: string;
  otp: string;
}

export interface IEmailSender {
  sendOtpEmail(params: SendOtpEmailParams): Promise<void>;
}

export const EMAIL_SENDER = Symbol("EMAIL_SENDER");
