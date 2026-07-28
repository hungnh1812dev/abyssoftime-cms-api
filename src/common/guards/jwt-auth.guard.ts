import { type AccessTokenPayload } from "../types/jwt-payload";

import { Injectable, UnauthorizedException } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";

export const ACCESS_TOKEN_COOKIE = "access_token";

@Injectable()
export class JwtAuthGuard extends AuthGuard("jwt") {
  // passport-jwt sets info to an Error("No auth token") when jwtCookieExtractor (jwt.strategy.ts)
  // returns null; any other failure (bad signature, expired, malformed, or no user at all) is a
  // verification failure. Branching on this preserves today's two distinct 401 messages exactly —
  // a deliberate, accepted coupling to passport-jwt's internal wording (see auth-passport-techstack.md).
  handleRequest<TUser = AccessTokenPayload>(err: unknown, user: TUser, info: unknown): TUser {
    if (info instanceof Error && info.message === "No auth token") {
      throw new UnauthorizedException("Missing access token");
    }

    if (err || !user) {
      throw new UnauthorizedException("Invalid or expired access token");
    }

    return user;
  }
}
