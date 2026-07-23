import { EMAIL_SENDER, type IEmailSender } from "../../domain/ports/email-sender.port";
import { ResendOtpDto } from "../dto/resend-otp.dto";
import * as bcrypt from "bcryptjs";

import { ConflictException, NotFoundException } from "@nestjs/common";
import { Test } from "@nestjs/testing";

import { UserEntity } from "@/modules/users/domain/entities/user.entity";
import { type IUserRepository, USER_REPOSITORY } from "@/modules/users/domain/repositories/user.repository";

import { ResendOtpService } from "./resend-otp.service";

describe("ResendOtpService", () => {
  let service: ResendOtpService;
  let users: jest.Mocked<IUserRepository>;
  let emailSender: jest.Mocked<IEmailSender>;

  const dto: ResendOtpDto = { email: "jane@example.com" };

  const buildUser = (verified: boolean) =>
    new UserEntity("user-1", dto.email, "Jane Doe", "janedoe", "hashed-password", true, verified, null, new Date(), new Date(), "old-hash", new Date());

  beforeEach(async () => {
    users = {
      findAll: jest.fn(),
      findById: jest.fn(),
      findByEmail: jest.fn(),
      findByUsername: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
      hasAnyVerified: jest.fn(),
      findByResetTokenHash: jest.fn(),
    };
    emailSender = { sendOtpEmail: jest.fn(), sendPasswordResetEmail: jest.fn() };

    users.update.mockImplementation((documentId, data) =>
      Promise.resolve(
        new UserEntity(
          documentId,
          dto.email,
          "Jane Doe",
          "janedoe",
          "hashed-password",
          true,
          data.verified ?? false,
          null,
          new Date(),
          new Date(),
          data.otpCodeHash,
          data.otpExpiresAt,
        ),
      ),
    );

    const module = await Test.createTestingModule({
      providers: [ResendOtpService, { provide: USER_REPOSITORY, useValue: users }, { provide: EMAIL_SENDER, useValue: emailSender }],
    }).compile();

    service = module.get(ResendOtpService);
  });

  it("throws NotFoundException when no user matches the email", async () => {
    users.findByEmail.mockResolvedValue(null);

    await expect(service.execute(dto)).rejects.toThrow(NotFoundException);
  });

  it("throws ConflictException when the user is already verified", async () => {
    users.findByEmail.mockResolvedValue(buildUser(true));

    await expect(service.execute(dto)).rejects.toThrow(ConflictException);
  });

  it("generates a fresh hashed OTP, persists it, and emails the new code", async () => {
    users.findByEmail.mockResolvedValue(buildUser(false));

    await service.execute(dto);

    expect(users.update).toHaveBeenCalledTimes(1);
    const [documentId, updateData] = users.update.mock.calls[0];
    expect(documentId).toBe("user-1");
    expect(updateData.otpCodeHash).toBeTruthy();
    expect(updateData.otpCodeHash).not.toBe("old-hash");
    expect(updateData.otpExpiresAt).toBeInstanceOf(Date);
    expect(updateData.otpExpiresAt!.getTime()).toBeGreaterThan(Date.now());

    expect(emailSender.sendOtpEmail).toHaveBeenCalledTimes(1);
    const emailCall = emailSender.sendOtpEmail.mock.calls[0][0];
    expect(emailCall.email).toBe(dto.email);
    expect(emailCall.otp).toMatch(/^\d{6}$/);
    expect(await bcrypt.compare(emailCall.otp, updateData.otpCodeHash!)).toBe(true);
  });
});
