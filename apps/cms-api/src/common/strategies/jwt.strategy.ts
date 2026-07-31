import { ACCESS_TOKEN_COOKIE } from "../guards/jwt-auth.guard";
import { type AccessTokenPayload } from "../types/jwt-payload";
import { type Request } from "express";
import { Strategy, type StrategyOptions } from "passport-jwt";

import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PassportStrategy } from "@nestjs/passport";

import { type EnvironmentVariables } from "@/config/env.validation";

// passport-jwt ships no cookie extractor (only header/body/query ones) — a plain function is its
// documented, idiomatic way to read the token from somewhere else, here the httpOnly access_token cookie.
export function jwtCookieExtractor(req: Request): string | null {
  const token: unknown = req.cookies?.[ACCESS_TOKEN_COOKIE];
  return typeof token === "string" && token.length > 0 ? token : null;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, "jwt") {
  constructor(configService: ConfigService<EnvironmentVariables, true>) {
    super({
      jwtFromRequest: jwtCookieExtractor,
      ignoreExpiration: false,
      secretOrKey: configService.get("JWT_ACCESS_SECRET", { infer: true }),
    } satisfies StrategyOptions);
  }

  // Pure pass-through: the access token is already self-contained (sub/roleSlug/level/permissions);
  // today's guard never hits the DB here, and this preserves that property exactly.
  validate(payload: AccessTokenPayload): AccessTokenPayload {
    return payload;
  }
}
