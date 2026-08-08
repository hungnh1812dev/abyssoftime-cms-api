import { type AccessTokenPayload } from "../types/jwt-payload";

import { Injectable, UnauthorizedException } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";

// Strategy order here is load-bearing: both "jwt" and "api-token" now read the same
// Authorization header (JwtStrategy switched from a cookie extractor to
// ExtractJwt.fromAuthHeaderAsBearerToken() — see jwt.strategy.ts). Passport tries "jwt" first
// and falls through to "api-token" on a fail() (not error()), which is what passport-jwt does
// on a malformed-JWT decode. API tokens are always `cms_<64-hex>` (from
// generateAccessTokenSecret), never dot-segmented, so they can never parse as a JWT — but this
// fallthrough depends on that shape and on "jwt" staying first in the array.
@Injectable()
export class JwtAuthGuard extends AuthGuard(["jwt", "api-token"]) {
  // passport-jwt sets info to an Error("No auth token") when the Authorization-header extractor
  // (jwt.strategy.ts) returns null; any other failure (bad signature, expired, malformed, or no
  // user at all) is a verification failure. Branching on this preserves today's two distinct 401
  // messages exactly — a deliberate, accepted coupling to passport-jwt's internal wording (see
  // auth-passport-techstack.md).
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
