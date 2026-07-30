import { VerifyOtpDto } from "../dto/verify-otp.dto";
import * as bcrypt from "bcryptjs";

import { BadRequestException, ConflictException, NotFoundException } from "@nestjs/common";
import { Test } from "@nestjs/testing";

import { RoleEntity } from "@/modules/roles/domain/entities/role.entiry";
import { type IRoleRepository, ROLE_REPOSITORY } from "@/modules/roles/domain/repositories/role.repository";
import { UserEntity } from "@/modules/users/domain/entities/user.entity";
import { type IUserRepository, USER_REPOSITORY } from "@/modules/users/domain/repositories/user.repository";

import { VerifyOtpService } from "./verify-otp.service";

describe("VerifyOtpService", () => {
  let service: VerifyOtpService;
  let users: jest.Mocked<IUserRepository>;
  let roles: jest.Mocked<IRoleRepository>;

  const dto: VerifyOtpDto = { email: "jane@example.com", otp: "123456" };

  const superAdminRole = new RoleEntity(
    "role-super",
    "Super Admin",
    "super_admin",
    ["user:manager", "role:manager", "permission:manager"],
    100,
    true,
    new Date(),
    new Date(),
    null,
  );
  const guestRole = new RoleEntity("role-guest", "Guest", "guest", [], 0, true, new Date(), new Date(), null);

  const buildUser = (overrides: Partial<{ verified: boolean; otpCodeHash: string | null; otpExpiresAt: Date | null }> = {}) =>
    new UserEntity(
      "user-1",
      dto.email,
      "Jane Doe",
      "janedoe",
      "hashed-password",
      true,
      overrides.verified ?? false,
      null,
      new Date(),
      new Date(),
      overrides.otpCodeHash ?? "otp-hash",
      overrides.otpExpiresAt ?? new Date(Date.now() + 5 * 60 * 1000),
    );

  beforeEach(async () => {
    users = {
      findAll: jest.fn(),
      findById: jest.fn(),
      findByEmail: jest.fn(),
      findByUsername: jest.fn(),
      findByIds: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
      hasAnyVerified: jest.fn(),
      findByResetTokenHash: jest.fn(),
      completeVerification: jest.fn(),
    };
    roles = {
      findAll: jest.fn(),
      findBySlug: jest.fn((slug: string) => Promise.resolve(slug === "super_admin" ? superAdminRole : guestRole)),
      findById: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      hasAny: jest.fn(),
    };

    const module = await Test.createTestingModule({
      providers: [VerifyOtpService, { provide: USER_REPOSITORY, useValue: users }, { provide: ROLE_REPOSITORY, useValue: roles }],
    }).compile();

    service = module.get(VerifyOtpService);
  });

  it("throws NotFoundException when no user matches the email", async () => {
    users.findByEmail.mockResolvedValue(null);

    await expect(service.execute(dto)).rejects.toThrow(NotFoundException);
  });

  it("throws ConflictException when the user is already verified", async () => {
    users.findByEmail.mockResolvedValue(buildUser({ verified: true }));

    await expect(service.execute(dto)).rejects.toThrow(ConflictException);
  });

  it("throws BadRequestException when there is no pending OTP", async () => {
    users.findByEmail.mockResolvedValue(buildUser({ otpCodeHash: null, otpExpiresAt: null }));

    await expect(service.execute(dto)).rejects.toThrow(BadRequestException);
  });

  it("throws BadRequestException when the OTP hash is set but the expiry is missing", async () => {
    users.findByEmail.mockResolvedValue(buildUser({ otpCodeHash: "some-hash", otpExpiresAt: null }));

    await expect(service.execute(dto)).rejects.toThrow(BadRequestException);
  });

  it("throws BadRequestException when the OTP has expired", async () => {
    const otpCodeHash = await bcrypt.hash(dto.otp, 10);
    users.findByEmail.mockResolvedValue(buildUser({ otpCodeHash, otpExpiresAt: new Date(Date.now() - 1000) }));

    await expect(service.execute(dto)).rejects.toThrow(BadRequestException);
    expect(users.completeVerification).not.toHaveBeenCalled();
  });

  it("throws BadRequestException when the OTP does not match", async () => {
    const otpCodeHash = await bcrypt.hash("999999", 10);
    users.findByEmail.mockResolvedValue(buildUser({ otpCodeHash }));

    await expect(service.execute(dto)).rejects.toThrow(BadRequestException);
    expect(users.completeVerification).not.toHaveBeenCalled();
  });

  it("delegates the first-verifier-vs-guest decision atomically to the repository", async () => {
    const otpCodeHash = await bcrypt.hash(dto.otp, 10);
    const user = buildUser({ otpCodeHash });
    users.findByEmail.mockResolvedValue(user);
    users.completeVerification.mockResolvedValue(user);

    await service.execute(dto);

    expect(roles.findBySlug).toHaveBeenCalledWith("super_admin");
    expect(roles.findBySlug).toHaveBeenCalledWith("guest");
    expect(users.completeVerification).toHaveBeenCalledWith("user-1", {
      firstVerifiedRoleId: superAdminRole.documentId,
      otherwiseRoleId: guestRole.documentId,
    });
  });
});
