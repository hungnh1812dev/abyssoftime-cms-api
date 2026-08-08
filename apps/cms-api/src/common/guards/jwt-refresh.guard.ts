import { RefreshTokenPayload } from "../types/jwt-payload";

import { Injectable, UnauthorizedException } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";

export const REFRESH_TOKEN_COOKIE = "refresh_token";

@Injectable()
export class JwtRefreshGuard extends AuthGuard(["jwt-refresh"]) {
  // passport-jwt sets info to an Error("No auth token") when jwtRefreshCookieExtractor
  // (jwt-refresh.strategy.ts) returns null; any other failure (bad signature, expired, malformed,
  // or no user at all) is a
  // verification failure. Branching on this preserves today's two distinct 401 messages exactly —
  // a deliberate, accepted coupling to passport-jwt's internal wording (see auth-passport-techstack.md).
  handleRequest<TUser = RefreshTokenPayload>(err: unknown, user: TUser, info: unknown): TUser {
    if (info instanceof Error && info.message === "No auth token") {
      throw new UnauthorizedException("Missing refresh token");
    }

    if (err || !user) {
      throw new UnauthorizedException("Invalid or expired refresh token");
    }

    return user;
  }
}
