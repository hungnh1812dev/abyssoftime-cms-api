import { ResetPasswordDto } from "../dto/reset-password.dto";
import * as bcrypt from "bcryptjs";
import { createHash } from "node:crypto";

import { BadRequestException, Inject, Injectable } from "@nestjs/common";

import { type IUserRepository, USER_REPOSITORY } from "@/modules/users/domain/repositories/user.repository";

const BCRYPT_SALT_ROUNDS = 10;
const INVALID_OR_EXPIRED_MESSAGE = "Invalid or expired reset token";

@Injectable()
export class ResetPasswordService {
  constructor(@Inject(USER_REPOSITORY) private readonly users: IUserRepository) {}

  async execute(dto: ResetPasswordDto): Promise<void> {
    const tokenHash = createHash("sha256").update(dto.token).digest("hex");
    const user = await this.users.findByResetTokenHash(tokenHash);
    if (!user) {
      throw new BadRequestException(INVALID_OR_EXPIRED_MESSAGE);
    }

    if (!user.resetTokenExpiresAt || user.resetTokenExpiresAt.getTime() < Date.now()) {
      throw new BadRequestException(INVALID_OR_EXPIRED_MESSAGE);
    }

    const hashedPassword = await bcrypt.hash(dto.newPassword, BCRYPT_SALT_ROUNDS);

    await this.users.update(user.documentId, {
      password: hashedPassword,
      resetTokenHash: null,
      resetTokenExpiresAt: null,
    });
  }
}
