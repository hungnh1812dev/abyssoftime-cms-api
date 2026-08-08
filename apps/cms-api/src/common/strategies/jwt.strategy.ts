import { type AccessTokenPayload } from "../types/jwt-payload";
import { ExtractJwt, Strategy, type StrategyOptions } from "passport-jwt";

import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PassportStrategy } from "@nestjs/passport";

import { type EnvironmentVariables } from "@/config/env.validation";

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, "jwt") {
  constructor(configService: ConfigService<EnvironmentVariables, true>) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
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
