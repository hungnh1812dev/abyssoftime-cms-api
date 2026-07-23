import { EMAIL_SENDER, type IEmailSender } from "../../domain/ports/email-sender.port";
import { RegisterDto } from "../dto/register.dto";
import * as bcrypt from "bcryptjs";

import { ConflictException } from "@nestjs/common";
import { Test } from "@nestjs/testing";

import { UserEntity } from "@/modules/users/domain/entities/user.entity";
import { type CreateUserData, type IUserRepository, USER_REPOSITORY } from "@/modules/users/domain/repositories/user.repository";

import { RegisterService } from "./register.service";

describe("RegisterService", () => {
  let service: RegisterService;
  let users: jest.Mocked<IUserRepository>;
  let emailSender: jest.Mocked<IEmailSender>;

  const dto: RegisterDto = {
    email: "jane@example.com",
    name: "Jane Doe",
    username: "janedoe",
    password: "s3cret-password",
    accountType: true,
  };

  const existingUser = new UserEntity("user-1", dto.email, dto.name, dto.username, "hashed", dto.accountType, false, null, new Date(), new Date());

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

    users.findByEmail.mockResolvedValue(null);
    users.findByUsername.mockResolvedValue(null);
    users.create.mockImplementation((data: CreateUserData) =>
      Promise.resolve(
        new UserEntity(
          "user-1",
          data.email,
          data.name,
          data.username,
          data.password,
          data.accountType,
          data.verified,
          data.roleId,
          new Date(),
          new Date(),
          data.otpCodeHash ?? null,
          data.otpExpiresAt ?? null,
        ),
      ),
    );

    const module = await Test.createTestingModule({
      providers: [RegisterService, { provide: USER_REPOSITORY, useValue: users }, { provide: EMAIL_SENDER, useValue: emailSender }],
    }).compile();

    service = module.get(RegisterService);
  });

  it("throws ConflictException when the email is already in use", async () => {
    users.findByEmail.mockResolvedValue(existingUser);

    await expect(service.execute(dto)).rejects.toThrow(ConflictException);
    expect(users.create).not.toHaveBeenCalled();
  });

  it("throws ConflictException when the username is already in use", async () => {
    users.findByUsername.mockResolvedValue(existingUser);

    await expect(service.execute(dto)).rejects.toThrow(ConflictException);
    expect(users.create).not.toHaveBeenCalled();
  });

  it("creates an unverified, roleless user with a hashed password and a hashed OTP, then emails the OTP", async () => {
    await service.execute(dto);

    expect(users.create).toHaveBeenCalledTimes(1);
    const createData = users.create.mock.calls[0][0];

    expect(createData.email).toBe(dto.email);
    expect(createData.name).toBe(dto.name);
    expect(createData.username).toBe(dto.username);
    expect(createData.accountType).toBe(dto.accountType);
    expect(createData.verified).toBe(false);
    expect(createData.roleId).toBeNull();
    expect(createData.password).not.toBe(dto.password);
    expect(await bcrypt.compare(dto.password, createData.password)).toBe(true);

    expect(createData.otpCodeHash).toBeTruthy();
    expect(createData.otpExpiresAt).toBeInstanceOf(Date);
    expect(createData.otpExpiresAt!.getTime()).toBeGreaterThan(Date.now());

    expect(emailSender.sendOtpEmail).toHaveBeenCalledTimes(1);
    const emailCall = emailSender.sendOtpEmail.mock.calls[0][0];
    expect(emailCall.email).toBe(dto.email);
    expect(emailCall.otp).toMatch(/^\d{6}$/);
    expect(await bcrypt.compare(emailCall.otp, createData.otpCodeHash!)).toBe(true);
  });
});
