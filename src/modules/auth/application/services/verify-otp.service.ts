import { VerifyOtpDto } from "../dto/verify-otp.dto";
import * as bcrypt from "bcryptjs";

import { BadRequestException, ConflictException, Inject, Injectable, NotFoundException } from "@nestjs/common";

import { type IRoleRepository, ROLE_REPOSITORY } from "@/modules/roles/domain/repositories/role.repository";
import { type IUserRepository, USER_REPOSITORY } from "@/modules/users/domain/repositories/user.repository";

const SUPER_ADMIN_ROLE_SLUG = "super_admin";
const GUEST_ROLE_SLUG = "guest";

@Injectable()
export class VerifyOtpService {
  constructor(
    @Inject(USER_REPOSITORY) private readonly users: IUserRepository,
    @Inject(ROLE_REPOSITORY) private readonly roles: IRoleRepository,
  ) {}

  async execute(dto: VerifyOtpDto): Promise<void> {
    const user = await this.users.findByEmail(dto.email);
    if (!user) {
      throw new NotFoundException(`User with email "${dto.email}" not found`);
    }

    if (user.verified) {
      throw new ConflictException("Email is already verified");
    }

    if (!user.otpCodeHash || !user.otpExpiresAt) {
      throw new BadRequestException("Invalid or expired OTP");
    }

    if (user.otpExpiresAt.getTime() < Date.now()) {
      throw new BadRequestException("Invalid or expired OTP");
    }

    const otpMatches = await bcrypt.compare(dto.otp, user.otpCodeHash);
    if (!otpMatches) {
      throw new BadRequestException("Invalid or expired OTP");
    }

    // "First verifier wins super_admin" must be decided atomically with the write — resolving both
    // roles up front and delegating the actual decision to the repository closes the race where two
    // concurrent verifications could otherwise both read "no verified user yet". See
    // docs/documents/auth-issues-fix.md #1.
    const [superAdminRole, guestRole] = await Promise.all([this.roles.findBySlug(SUPER_ADMIN_ROLE_SLUG), this.roles.findBySlug(GUEST_ROLE_SLUG)]);

    await this.users.completeVerification(user.documentId, {
      firstVerifiedRoleId: superAdminRole.documentId,
      otherwiseRoleId: guestRole.documentId,
    });
  }
}
