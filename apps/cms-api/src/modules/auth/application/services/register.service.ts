import { EMAIL_SENDER, type IEmailSender } from "../../domain/ports/email-sender.port";
import { RegisterDto } from "../dto/register.dto";
import * as bcrypt from "bcryptjs";
import { randomInt } from "node:crypto";

import { ConflictException, Inject, Injectable } from "@nestjs/common";

import { type IUserRepository, USER_REPOSITORY, UserAlreadyExistsError } from "@/modules/users/domain/repositories/user.repository";

const OTP_MIN = 100000;
const OTP_MAX_EXCLUSIVE = 1000000;
const OTP_TTL_MS = 10 * 60 * 1000;
const BCRYPT_SALT_ROUNDS = 10;

@Injectable()
export class RegisterService {
  constructor(
    @Inject(USER_REPOSITORY) private readonly users: IUserRepository,
    @Inject(EMAIL_SENDER) private readonly emailSender: IEmailSender,
  ) {}

  async execute(dto: RegisterDto): Promise<void> {
    const existingByEmail = await this.users.findByEmail(dto.email);
    if (existingByEmail) {
      throw new ConflictException(`Email "${dto.email}" is already in use`);
    }

    const existingByUsername = await this.users.findByUsername(dto.username);
    if (existingByUsername) {
      throw new ConflictException(`Username "${dto.username}" is already in use`);
    }

    const hashedPassword = await bcrypt.hash(dto.password, BCRYPT_SALT_ROUNDS);
    const otp = randomInt(OTP_MIN, OTP_MAX_EXCLUSIVE).toString();
    const otpCodeHash = await bcrypt.hash(otp, BCRYPT_SALT_ROUNDS);
    const otpExpiresAt = new Date(Date.now() + OTP_TTL_MS);

    try {
      await this.users.create({
        email: dto.email,
        name: dto.name,
        username: dto.username,
        password: hashedPassword,
        accountType: dto.accountType,
        verified: false,
        roleId: null,
        otpCodeHash,
        otpExpiresAt,
      });
    } catch (error) {
      // Safety net for the rare race where two requests pass the pre-checks above concurrently —
      // the DB's unique constraints are the real source of truth. See docs/documents/auth-issues-fix.md #3.
      if (error instanceof UserAlreadyExistsError) {
        throw new ConflictException(error.message);
      }
      throw error;
    }

    await this.emailSender.sendOtpEmail({ email: dto.email, otp });
  }
}
