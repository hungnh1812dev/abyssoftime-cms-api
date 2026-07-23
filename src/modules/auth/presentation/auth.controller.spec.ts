import { LoginDto } from "../application/dto/login.dto";
import { RegisterDto } from "../application/dto/register.dto";
import { ResendOtpDto } from "../application/dto/resend-otp.dto";
import { VerifyOtpDto } from "../application/dto/verify-otp.dto";
import { HasUsersService } from "../application/services/has-users.service";
import { LoginService } from "../application/services/login.service";
import { RefreshTokenService } from "../application/services/refresh-token.service";
import { RegisterService } from "../application/services/register.service";
import { ResendOtpService } from "../application/services/resend-otp.service";
import { VerifyOtpService } from "../application/services/verify-otp.service";
import { type Request, type Response } from "express";

import { UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Test } from "@nestjs/testing";

import { ACCESS_TOKEN_COOKIE } from "@/common/guards/jwt-auth.guard";

import { AuthController, REFRESH_TOKEN_COOKIE } from "./auth.controller";

describe("AuthController", () => {
  let controller: AuthController;
  let registerService: jest.Mocked<RegisterService>;
  let verifyOtpService: jest.Mocked<VerifyOtpService>;
  let resendOtpService: jest.Mocked<ResendOtpService>;
  let hasUsersService: jest.Mocked<HasUsersService>;
  let loginService: jest.Mocked<LoginService>;
  let refreshTokenService: jest.Mocked<RefreshTokenService>;
  let res: jest.Mocked<Pick<Response, "cookie" | "clearCookie">>;

  const configValues: Record<string, unknown> = { COOKIE_SECURE: true, COOKIE_SAMESITE: "lax" };

  beforeEach(async () => {
    res = { cookie: jest.fn(), clearCookie: jest.fn() };

    const module = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        { provide: RegisterService, useValue: { execute: jest.fn() } },
        { provide: VerifyOtpService, useValue: { execute: jest.fn() } },
        { provide: ResendOtpService, useValue: { execute: jest.fn() } },
        { provide: HasUsersService, useValue: { execute: jest.fn() } },
        { provide: LoginService, useValue: { execute: jest.fn() } },
        { provide: RefreshTokenService, useValue: { execute: jest.fn() } },
        { provide: ConfigService, useValue: { get: jest.fn((key: string) => configValues[key]) } },
      ],
    }).compile();

    controller = module.get(AuthController);
    registerService = module.get(RegisterService);
    verifyOtpService = module.get(VerifyOtpService);
    resendOtpService = module.get(ResendOtpService);
    hasUsersService = module.get(HasUsersService);
    loginService = module.get(LoginService);
    refreshTokenService = module.get(RefreshTokenService);
  });

  it("register() delegates to RegisterService", async () => {
    const dto: RegisterDto = { email: "jane@example.com", name: "Jane Doe", username: "janedoe", password: "s3cret", accountType: true };
    registerService.execute.mockResolvedValue(undefined);

    const result = await controller.register(dto);

    expect(registerService.execute).toHaveBeenCalledWith(dto);
    expect(result).toEqual({ message: "Registration successful. Check your email for the verification code." });
  });

  it("verifyOtp() delegates to VerifyOtpService", async () => {
    const dto: VerifyOtpDto = { email: "jane@example.com", otp: "123456" };
    verifyOtpService.execute.mockResolvedValue(undefined);

    const result = await controller.verifyOtp(dto);

    expect(verifyOtpService.execute).toHaveBeenCalledWith(dto);
    expect(result).toEqual({ message: "Email verified successfully." });
  });

  it("resendOtp() delegates to ResendOtpService", async () => {
    const dto: ResendOtpDto = { email: "jane@example.com" };
    resendOtpService.execute.mockResolvedValue(undefined);

    const result = await controller.resendOtp(dto);

    expect(resendOtpService.execute).toHaveBeenCalledWith(dto);
    expect(result).toEqual({ message: "A new verification code has been sent." });
  });

  it("hasUsers() delegates to HasUsersService and reports true", async () => {
    hasUsersService.execute.mockResolvedValue(true);

    const result = await controller.hasUsers();

    expect(hasUsersService.execute).toHaveBeenCalled();
    expect(result).toEqual({ hasUsers: true });
  });

  it("hasUsers() reports false when no user exists", async () => {
    hasUsersService.execute.mockResolvedValue(false);

    const result = await controller.hasUsers();

    expect(result).toEqual({ hasUsers: false });
  });

  it("login() delegates to LoginService and sets httpOnly auth cookies", async () => {
    const dto: LoginDto = { email: "jane@example.com", password: "s3cret" };
    loginService.execute.mockResolvedValue({ accessToken: "access-token", refreshToken: "refresh-token" });

    const result = await controller.login(dto, res as unknown as Response);

    expect(loginService.execute).toHaveBeenCalledWith(dto);
    expect(res.cookie).toHaveBeenCalledWith(ACCESS_TOKEN_COOKIE, "access-token", expect.objectContaining({ httpOnly: true, secure: true, sameSite: "lax" }));
    expect(res.cookie).toHaveBeenCalledWith(REFRESH_TOKEN_COOKIE, "refresh-token", expect.objectContaining({ httpOnly: true, secure: true, sameSite: "lax" }));
    expect(result).toEqual({ message: "Login successful." });
  });

  it("refresh() reads the refresh cookie, delegates to RefreshTokenService, and rotates auth cookies", async () => {
    const req = { cookies: { [REFRESH_TOKEN_COOKIE]: "old-refresh-token" } } as unknown as Request;
    refreshTokenService.execute.mockResolvedValue({ accessToken: "new-access-token", refreshToken: "new-refresh-token" });

    const result = await controller.refresh(req, res as unknown as Response);

    expect(refreshTokenService.execute).toHaveBeenCalledWith("old-refresh-token");
    expect(res.cookie).toHaveBeenCalledWith(ACCESS_TOKEN_COOKIE, "new-access-token", expect.any(Object));
    expect(res.cookie).toHaveBeenCalledWith(REFRESH_TOKEN_COOKIE, "new-refresh-token", expect.any(Object));
    expect(result).toEqual({ message: "Token refreshed." });
  });

  it("refresh() throws UnauthorizedException when the refresh cookie is missing", async () => {
    const req = { cookies: {} } as unknown as Request;

    await expect(controller.refresh(req, res as unknown as Response)).rejects.toThrow(UnauthorizedException);
    expect(refreshTokenService.execute).not.toHaveBeenCalled();
  });

  it("logout() clears both auth cookies", () => {
    const result = controller.logout(res as unknown as Response);

    expect(res.clearCookie).toHaveBeenCalledWith(ACCESS_TOKEN_COOKIE);
    expect(res.clearCookie).toHaveBeenCalledWith(REFRESH_TOKEN_COOKIE);
    expect(result).toEqual({ message: "Logged out." });
  });
});
