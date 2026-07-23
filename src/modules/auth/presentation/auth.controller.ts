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

import { Body, Controller, Get, HttpCode, HttpStatus, Post, Req, Res, UnauthorizedException, UseGuards } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

import { ACCESS_TOKEN_COOKIE } from "@/common/guards/jwt-auth.guard";
import { RateLimitGuard } from "@/common/guards/rate-limit.guard";
import { type EnvironmentVariables } from "@/config/env.validation";

export const REFRESH_TOKEN_COOKIE = "refresh_token";
const ACCESS_TOKEN_MAX_AGE_MS = 15 * 60 * 1000;
const REFRESH_TOKEN_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

@Controller("/api/auth")
export class AuthController {
  constructor(
    private readonly registerService: RegisterService,
    private readonly verifyOtpService: VerifyOtpService,
    private readonly resendOtpService: ResendOtpService,
    private readonly hasUsersService: HasUsersService,
    private readonly loginService: LoginService,
    private readonly refreshTokenService: RefreshTokenService,
    private readonly configService: ConfigService<EnvironmentVariables, true>,
  ) {}

  @Post("register")
  @UseGuards(RateLimitGuard)
  async register(@Body() dto: RegisterDto): Promise<{ message: string }> {
    await this.registerService.execute(dto);
    return { message: "Registration successful. Check your email for the verification code." };
  }

  @Post("verify-otp")
  @HttpCode(HttpStatus.OK)
  @UseGuards(RateLimitGuard)
  async verifyOtp(@Body() dto: VerifyOtpDto): Promise<{ message: string }> {
    await this.verifyOtpService.execute(dto);
    return { message: "Email verified successfully." };
  }

  @Post("resend-otp")
  @HttpCode(HttpStatus.OK)
  @UseGuards(RateLimitGuard)
  async resendOtp(@Body() dto: ResendOtpDto): Promise<{ message: string }> {
    await this.resendOtpService.execute(dto);
    return { message: "A new verification code has been sent." };
  }

  @Get("has-users")
  async hasUsers(): Promise<{ hasUsers: boolean }> {
    const hasUsers = await this.hasUsersService.execute();
    return { hasUsers };
  }

  @Post("login")
  @HttpCode(HttpStatus.OK)
  @UseGuards(RateLimitGuard)
  async login(@Body() dto: LoginDto, @Res({ passthrough: true }) res: Response): Promise<{ message: string }> {
    const { accessToken, refreshToken } = await this.loginService.execute(dto);
    this.setAuthCookies(res, accessToken, refreshToken);
    return { message: "Login successful." };
  }

  @Post("refresh")
  @HttpCode(HttpStatus.OK)
  async refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response): Promise<{ message: string }> {
    const token: unknown = req.cookies?.[REFRESH_TOKEN_COOKIE];
    if (typeof token !== "string" || token.length === 0) {
      throw new UnauthorizedException("Missing refresh token");
    }

    const { accessToken, refreshToken } = await this.refreshTokenService.execute(token);
    this.setAuthCookies(res, accessToken, refreshToken);
    return { message: "Token refreshed." };
  }

  @Post("logout")
  @HttpCode(HttpStatus.OK)
  logout(@Res({ passthrough: true }) res: Response): { message: string } {
    res.clearCookie(ACCESS_TOKEN_COOKIE);
    res.clearCookie(REFRESH_TOKEN_COOKIE);
    return { message: "Logged out." };
  }

  private setAuthCookies(res: Response, accessToken: string, refreshToken: string): void {
    const secure = this.configService.get("COOKIE_SECURE", { infer: true });
    const sameSite = this.configService.get("COOKIE_SAMESITE", { infer: true });

    res.cookie(ACCESS_TOKEN_COOKIE, accessToken, { httpOnly: true, secure, sameSite, maxAge: ACCESS_TOKEN_MAX_AGE_MS });
    res.cookie(REFRESH_TOKEN_COOKIE, refreshToken, { httpOnly: true, secure, sameSite, maxAge: REFRESH_TOKEN_MAX_AGE_MS });
  }
}
