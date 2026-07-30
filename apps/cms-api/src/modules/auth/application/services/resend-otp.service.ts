import { EMAIL_SENDER, type IEmailSender } from "../../domain/ports/email-sender.port";
import { ResendOtpDto } from "../dto/resend-otp.dto";
import * as bcrypt from "bcryptjs";
import { randomInt } from "node:crypto";

import { ConflictException, Inject, Injectable, NotFoundException } from "@nestjs/common";

import { type IUserRepository, USER_REPOSITORY } from "@/modules/users/domain/repositories/user.repository";

const OTP_MIN = 100000;
const OTP_MAX_EXCLUSIVE = 1000000;
const OTP_TTL_MS = 10 * 60 * 1000;
const BCRYPT_SALT_ROUNDS = 10;

@Injectable()
export class ResendOtpService {
  constructor(
    @Inject(USER_REPOSITORY) private readonly users: IUserRepository,
    @Inject(EMAIL_SENDER) private readonly emailSender: IEmailSender,
  ) {}

  async execute(dto: ResendOtpDto): Promise<void> {
    const user = await this.users.findByEmail(dto.email);
    if (!user) {
      throw new NotFoundException(`User with email "${dto.email}" not found`);
    }

    if (user.verified) {
      throw new ConflictException("Email is already verified");
    }

    const otp = randomInt(OTP_MIN, OTP_MAX_EXCLUSIVE).toString();
    const otpCodeHash = await bcrypt.hash(otp, BCRYPT_SALT_ROUNDS);
    const otpExpiresAt = new Date(Date.now() + OTP_TTL_MS);

    await this.users.update(user.documentId, { otpCodeHash, otpExpiresAt });

    await this.emailSender.sendOtpEmail({ email: dto.email, otp });
  }
}
