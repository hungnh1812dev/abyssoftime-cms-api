import { ForgotPasswordDto } from "../application/dto/forgot-password.dto";
import { LoginDto } from "../application/dto/login.dto";
import { RegisterDto } from "../application/dto/register.dto";
import { ResendOtpDto } from "../application/dto/resend-otp.dto";
import { ResetPasswordDto } from "../application/dto/reset-password.dto";
import { VerifyOtpDto } from "../application/dto/verify-otp.dto";
import { ForgotPasswordService } from "../application/services/forgot-password.service";
import { GetMeService } from "../application/services/get-me.service";
import { HasUsersService } from "../application/services/has-users.service";
import { LoginService } from "../application/services/login.service";
import { RefreshTokenService } from "../application/services/refresh-token.service";
import { RegisterService } from "../application/services/register.service";
import { ResendOtpService } from "../application/services/resend-otp.service";
import { ResetPasswordService } from "../application/services/reset-password.service";
import { VerifyOtpService } from "../application/services/verify-otp.service";
import { type Request, type Response } from "express";

import { Body, Controller, Get, HttpCode, HttpStatus, Post, Req, Res, UnauthorizedException, UseGuards } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { AuthGuard } from "@nestjs/passport";
import { ApiCookieAuth, ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";

import { ACCESS_TOKEN_COOKIE, JwtAuthGuard } from "@/common/guards/jwt-auth.guard";
import { RateLimitGuard } from "@/common/guards/rate-limit.guard";
import { type ValidatedLoginUser } from "@/common/strategies/local.strategy";
import { type AuthenticatedRequest } from "@/common/types/authenticated-request";
import { type EnvironmentVariables } from "@/config/env.validation";

import { HasUsersResponseDto, MessageResponseDto } from "./dto/auth-response.dto";
import { MeResponseDto } from "./dto/me-response.dto";

export const REFRESH_TOKEN_COOKIE = "refresh_token";
const ACCESS_TOKEN_MAX_AGE_MS = 15 * 60 * 1000;

// Every route here is public by design (this module establishes identity), except `me` — the one
// route that reads an existing session back. login/refresh set the access_token/refresh_token
// httpOnly cookies; logout clears them.
@ApiTags("auth")
@Controller("auth")
export class AuthController {
  constructor(
    private readonly registerService: RegisterService,
    private readonly verifyOtpService: VerifyOtpService,
    private readonly resendOtpService: ResendOtpService,
    private readonly hasUsersService: HasUsersService,
    private readonly loginService: LoginService,
    private readonly refreshTokenService: RefreshTokenService,
    private readonly forgotPasswordService: ForgotPasswordService,
    private readonly resetPasswordService: ResetPasswordService,
    private readonly getMeService: GetMeService,
    private readonly configService: ConfigService<EnvironmentVariables, true>,
  ) {}

  @Post("register")
  @UseGuards(RateLimitGuard)
  @ApiOperation({ summary: "Register a new (unverified) account and email a 6-digit OTP" })
  @ApiResponse({ status: 201, type: MessageResponseDto })
  @ApiResponse({ status: 409, description: "Email or username already in use" })
  async register(@Body() dto: RegisterDto): Promise<{ message: string }> {
    await this.registerService.execute(dto);
    return { message: "Registration successful. Check your email for the verification code." };
  }

  @Post("verify-otp")
  @HttpCode(HttpStatus.OK)
  @UseGuards(RateLimitGuard)
  @ApiOperation({ summary: "Verify the emailed OTP — first-ever verifier becomes super_admin, everyone else becomes guest" })
  @ApiResponse({ status: 200, type: MessageResponseDto })
  @ApiResponse({ status: 400, description: "No pending OTP, it's expired, or it doesn't match" })
  @ApiResponse({ status: 404, description: "No account with that email" })
  @ApiResponse({ status: 409, description: "Account already verified" })
  async verifyOtp(@Body() dto: VerifyOtpDto): Promise<{ message: string }> {
    await this.verifyOtpService.execute(dto);
    return { message: "Email verified successfully." };
  }

  @Post("resend-otp")
  @HttpCode(HttpStatus.OK)
  @UseGuards(RateLimitGuard)
  @ApiOperation({ summary: "Re-send a fresh OTP to an unverified account" })
  @ApiResponse({ status: 200, type: MessageResponseDto })
  @ApiResponse({ status: 404, description: "No account with that email" })
  @ApiResponse({ status: 409, description: "Account already verified" })
  async resendOtp(@Body() dto: ResendOtpDto): Promise<{ message: string }> {
    await this.resendOtpService.execute(dto);
    return { message: "A new verification code has been sent." };
  }

  @Get("has-users")
  @ApiOperation({ summary: "Check whether any user account exists yet (drives a first-run admin setup flow)" })
  @ApiResponse({ status: 200, type: HasUsersResponseDto })
  async hasUsers(): Promise<{ hasUsers: boolean }> {
    const hasUsers = await this.hasUsersService.execute();
    return { hasUsers };
  }

  @Post("login")
  @HttpCode(HttpStatus.OK)
  @UseGuards(RateLimitGuard, AuthGuard("local"))
  @ApiOperation({ summary: "Log in — sets access_token/refresh_token httpOnly cookies on success" })
  @ApiResponse({ status: 200, type: MessageResponseDto })
  @ApiResponse({ status: 401, description: "Unknown email or wrong password (same message either way)" })
  @ApiResponse({ status: 403, description: "Email not verified yet" })
  // dto is unused in the handler body — kept only so Swagger's request-body introspection (which
  // reads the @Body()-decorated parameter's type) still documents the { email, password } shape.
  // The actual credential check now runs in LocalStrategy.validate() via AuthGuard("local").
  login(@Body() dto: LoginDto, @Req() req: Request & { user: ValidatedLoginUser }, @Res({ passthrough: true }) res: Response): { message: string } {
    const { accessToken, refreshToken, refreshTokenMaxAgeMs } = this.loginService.execute(req.user, dto.rememberMe ?? false);
    this.setAuthCookies(res, accessToken, refreshToken, refreshTokenMaxAgeMs);
    return { message: "Login successful." };
  }

  @Post("refresh")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Rotate the access/refresh token pair using the refresh_token cookie" })
  @ApiResponse({ status: 200, type: MessageResponseDto })
  @ApiResponse({ status: 401, description: "Refresh cookie missing, invalid, or expired" })
  async refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response): Promise<{ message: string }> {
    const token: unknown = req.cookies?.[REFRESH_TOKEN_COOKIE];
    if (typeof token !== "string" || token.length === 0) {
      throw new UnauthorizedException("Missing refresh token");
    }

    const { accessToken, refreshToken, refreshTokenMaxAgeMs } = await this.refreshTokenService.execute(token);
    this.setAuthCookies(res, accessToken, refreshToken, refreshTokenMaxAgeMs);
    return { message: "Token refreshed." };
  }

  @Post("logout")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Clear both auth cookies" })
  @ApiResponse({ status: 200, type: MessageResponseDto })
  logout(@Res({ passthrough: true }) res: Response): { message: string } {
    res.clearCookie(ACCESS_TOKEN_COOKIE);
    res.clearCookie(REFRESH_TOKEN_COOKIE);
    return { message: "Logged out." };
  }

  @Get("me")
  @UseGuards(JwtAuthGuard)
  @ApiCookieAuth()
  @ApiOperation({ summary: "Resolve the caller's own identity and role/permissions from the session cookie" })
  @ApiResponse({ status: 200, type: MeResponseDto })
  @ApiResponse({ status: 401, description: "Missing/invalid/expired access token, or the account was deleted after the token was issued" })
  @ApiResponse({ status: 404, description: "The user's roleId does not resolve to an existing role" })
  async me(@Req() req: AuthenticatedRequest): Promise<MeResponseDto> {
    const { user, role } = await this.getMeService.execute(req.user.sub);
    return MeResponseDto.fromEntities(user, role);
  }

  @Post("forgot-password")
  @HttpCode(HttpStatus.OK)
  @UseGuards(RateLimitGuard)
  @ApiOperation({ summary: "Request a password reset email — always responds success without revealing whether the email is registered" })
  @ApiResponse({ status: 200, type: MessageResponseDto })
  async forgotPassword(@Body() dto: ForgotPasswordDto): Promise<{ message: string }> {
    await this.forgotPasswordService.execute(dto);
    return { message: "If that email is registered, a password reset link has been sent." };
  }

  @Post("reset-password")
  @HttpCode(HttpStatus.OK)
  @UseGuards(RateLimitGuard)
  @ApiOperation({ summary: "Reset a password using the emailed reset token" })
  @ApiResponse({ status: 200, type: MessageResponseDto })
  @ApiResponse({ status: 400, description: "Invalid or expired reset token" })
  async resetPassword(@Body() dto: ResetPasswordDto): Promise<{ message: string }> {
    await this.resetPasswordService.execute(dto);
    return { message: "Password reset successfully." };
  }

  private setAuthCookies(res: Response, accessToken: string, refreshToken: string, refreshTokenMaxAgeMs: number): void {
    const secure = this.configService.get("COOKIE_SECURE", { infer: true });
    const sameSite = this.configService.get("COOKIE_SAMESITE", { infer: true });

    res.cookie(ACCESS_TOKEN_COOKIE, accessToken, { httpOnly: true, secure, sameSite, maxAge: ACCESS_TOKEN_MAX_AGE_MS });
    res.cookie(REFRESH_TOKEN_COOKIE, refreshToken, { httpOnly: true, secure, sameSite, maxAge: refreshTokenMaxAgeMs });
  }
}
