import { ResetPasswordDto } from "../dto/reset-password.dto";
import * as bcrypt from "bcryptjs";
import { createHash } from "node:crypto";

import { BadRequestException } from "@nestjs/common";
import { Test } from "@nestjs/testing";

import { UserEntity } from "@/modules/users/domain/entities/user.entity";
import { type IUserRepository, USER_REPOSITORY } from "@/modules/users/domain/repositories/user.repository";

import { ResetPasswordService } from "./reset-password.service";

describe("ResetPasswordService", () => {
  let service: ResetPasswordService;
  let users: jest.Mocked<IUserRepository>;

  const rawToken = "raw-reset-token";
  const tokenHash = createHash("sha256").update(rawToken).digest("hex");
  const dto: ResetPasswordDto = { token: rawToken, newPassword: "new-s3cret-password" };

  const buildUser = (overrides: Partial<{ resetTokenHash: string | null; resetTokenExpiresAt: Date | null }> = {}) =>
    new UserEntity(
      "user-1",
      "jane@example.com",
      "Jane Doe",
      "janedoe",
      "old-hashed-password",
      true,
      true,
      "role-1",
      new Date(),
      new Date(),
      null,
      null,
      overrides.resetTokenHash === undefined ? tokenHash : overrides.resetTokenHash,
      overrides.resetTokenExpiresAt === undefined ? new Date(Date.now() + 30 * 60 * 1000) : overrides.resetTokenExpiresAt,
    );

  beforeEach(async () => {
    users = {
      findAll: jest.fn(),
      findById: jest.fn(),
      findByEmail: jest.fn(),
      findByUsername: jest.fn(),
      findByIds: jest.fn(),
      findByResetTokenHash: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
      hasAnyVerified: jest.fn(),
      completeVerification: jest.fn(),
    };

    const module = await Test.createTestingModule({
      providers: [ResetPasswordService, { provide: USER_REPOSITORY, useValue: users }],
    }).compile();

    service = module.get(ResetPasswordService);
  });

  it("throws BadRequestException when no user matches the token hash", async () => {
    users.findByResetTokenHash.mockResolvedValue(null);

    await expect(service.execute(dto)).rejects.toThrow(BadRequestException);
    expect(users.findByResetTokenHash).toHaveBeenCalledWith(tokenHash);
  });

  it("throws BadRequestException when the reset token has expired", async () => {
    users.findByResetTokenHash.mockResolvedValue(buildUser({ resetTokenExpiresAt: new Date(Date.now() - 1000) }));

    await expect(service.execute(dto)).rejects.toThrow(BadRequestException);
    expect(users.update).not.toHaveBeenCalled();
  });

  it("throws BadRequestException when the user has no expiry recorded", async () => {
    users.findByResetTokenHash.mockResolvedValue(buildUser({ resetTokenExpiresAt: null }));

    await expect(service.execute(dto)).rejects.toThrow(BadRequestException);
  });

  it("hashes and sets the new password, then clears the reset token", async () => {
    const user = buildUser();
    users.findByResetTokenHash.mockResolvedValue(user);
    users.update.mockResolvedValue(user);

    await service.execute(dto);

    expect(users.update).toHaveBeenCalledTimes(1);
    const [documentId, updateData] = users.update.mock.calls[0];
    expect(documentId).toBe("user-1");
    expect(updateData.resetTokenHash).toBeNull();
    expect(updateData.resetTokenExpiresAt).toBeNull();
    expect(updateData.password).not.toBe(dto.newPassword);
    expect(await bcrypt.compare(dto.newPassword, updateData.password!)).toBe(true);
  });
});
