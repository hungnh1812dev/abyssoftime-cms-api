import { IEmailSender, SendOtpEmailParams, SendPasswordResetEmailParams } from "../../domain/ports/email-sender.port";

import { Injectable, Logger } from "@nestjs/common";

@Injectable()
export class ConsoleEmailSender implements IEmailSender {
  private readonly logger = new Logger(ConsoleEmailSender.name);

  sendOtpEmail({ email, otp }: SendOtpEmailParams): Promise<void> {
    this.logger.log(`OTP email to ${email}: ${otp}`);
    return Promise.resolve();
  }

  sendPasswordResetEmail({ email, resetToken }: SendPasswordResetEmailParams): Promise<void> {
    this.logger.log(`Password reset email to ${email}: ${resetToken}`);
    return Promise.resolve();
  }
}
