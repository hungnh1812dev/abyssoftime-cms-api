import { IEmailSender, SendOtpEmailParams } from "../../domain/ports/email-sender.port";

import { Injectable, Logger } from "@nestjs/common";

@Injectable()
export class ConsoleEmailSender implements IEmailSender {
  private readonly logger = new Logger(ConsoleEmailSender.name);

  sendOtpEmail({ email, otp }: SendOtpEmailParams): Promise<void> {
    this.logger.log(`OTP email to ${email}: ${otp}`);
    return Promise.resolve();
  }
}
