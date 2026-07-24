import { EMAIL_SENDER, type IEmailSender } from "../../domain/ports/email-sender.port";
import { ForgotPasswordDto } from "../dto/forgot-password.dto";
import { createHash, randomBytes } from "node:crypto";

import { Inject, Injectable } from "@nestjs/common";

import { type IUserRepository, USER_REPOSITORY } from "@/modules/users/domain/repositories/user.repository";

const RESET_TOKEN_BYTES = 32;
const RESET_TOKEN_TTL_MS = 60 * 60 * 1000;

@Injectable()
export class ForgotPasswordService {
  constructor(
    @Inject(USER_REPOSITORY) private readonly users: IUserRepository,
    @Inject(EMAIL_SENDER) private readonly emailSender: IEmailSender,
  ) {}

  async execute(dto: ForgotPasswordDto): Promise<void> {
    const user = await this.users.findByEmail(dto.email);

    // Pay the same randomBytes+sha256 cost on both branches so the "unknown email" response isn't
    // measurably faster than the "known email" one (timing side-channel on top of the identical
    // response body). Does not equalize the DB write / email dispatch the known-email branch also does.
    const resetToken = randomBytes(RESET_TOKEN_BYTES).toString("hex");
    const resetTokenHash = createHash("sha256").update(resetToken).digest("hex");

    if (!user) {
      return;
    }

    const resetTokenExpiresAt = new Date(Date.now() + RESET_TOKEN_TTL_MS);

    await this.users.update(user.documentId, { resetTokenHash, resetTokenExpiresAt });

    await this.emailSender.sendPasswordResetEmail({ email: dto.email, resetToken });
  }
}
