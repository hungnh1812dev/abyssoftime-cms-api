import { EMAIL_SENDER, type IEmailSender } from "../../domain/ports/email-sender.port";
import { ForgotPasswordDto } from "../dto/forgot-password.dto";
import * as crypto from "node:crypto";

import { Test } from "@nestjs/testing";

import { UserEntity } from "@/modules/users/domain/entities/user.entity";
import { type IUserRepository, USER_REPOSITORY } from "@/modules/users/domain/repositories/user.repository";

import { ForgotPasswordService } from "./forgot-password.service";

describe("ForgotPasswordService", () => {
  let service: ForgotPasswordService;
  let users: jest.Mocked<IUserRepository>;
  let emailSender: jest.Mocked<IEmailSender>;

  const dto: ForgotPasswordDto = { email: "jane@example.com" };
  const existingUser = new UserEntity("user-1", dto.email, "Jane Doe", "janedoe", "hashed-password", true, true, "role-1", new Date(), new Date());

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
    emailSender = { sendOtpEmail: jest.fn(), sendPasswordResetEmail: jest.fn() };

    const module = await Test.createTestingModule({
      providers: [ForgotPasswordService, { provide: USER_REPOSITORY, useValue: users }, { provide: EMAIL_SENDER, useValue: emailSender }],
    }).compile();

    service = module.get(ForgotPasswordService);
  });

  it("resolves without side effects when no user matches the email (avoids enumeration)", async () => {
    users.findByEmail.mockResolvedValue(null);

    await expect(service.execute(dto)).resolves.toBeUndefined();

    expect(users.update).not.toHaveBeenCalled();
    expect(emailSender.sendPasswordResetEmail).not.toHaveBeenCalled();
  });

  it("generates a hashed reset token, persists it with a ~1h expiry, and emails the raw token", async () => {
    users.findByEmail.mockResolvedValue(existingUser);

    await service.execute(dto);

    expect(users.update).toHaveBeenCalledTimes(1);
    const [documentId, updateData] = users.update.mock.calls[0];
    expect(documentId).toBe("user-1");
    expect(updateData.resetTokenHash).toBeTruthy();
    expect(updateData.resetTokenExpiresAt).toBeInstanceOf(Date);
    expect(updateData.resetTokenExpiresAt!.getTime()).toBeGreaterThan(Date.now());

    expect(emailSender.sendPasswordResetEmail).toHaveBeenCalledTimes(1);
    const emailCall = emailSender.sendPasswordResetEmail.mock.calls[0][0];
    expect(emailCall.email).toBe(dto.email);
    expect(emailCall.resetToken).toBeTruthy();

    const expectedHash = crypto.createHash("sha256").update(emailCall.resetToken).digest("hex");
    expect(updateData.resetTokenHash).toBe(expectedHash);
  });
});
