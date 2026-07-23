import { JwtTokenService } from "../token/jwt-token.service";
import { type AuthenticatedRequest } from "../types/authenticated-request";

import { CanActivate, type ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";

export const ACCESS_TOKEN_COOKIE = "access_token";

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly tokenService: JwtTokenService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const token: unknown = request.cookies?.[ACCESS_TOKEN_COOKIE];

    if (typeof token !== "string" || token.length === 0) {
      throw new UnauthorizedException("Missing access token");
    }

    try {
      request.user = this.tokenService.verifyAccessToken(token);
    } catch {
      throw new UnauthorizedException("Invalid or expired access token");
    }

    return true;
  }
}
