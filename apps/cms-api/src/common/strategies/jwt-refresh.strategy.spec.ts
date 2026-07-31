import { REFRESH_TOKEN_COOKIE } from "../guards/jwt-refresh.guard";
import { type RefreshTokenPayload } from "../types/jwt-payload";
import { type Request } from "express";

import { type ConfigService } from "@nestjs/config";

import { type EnvironmentVariables } from "@/config/env.validation";

import { jwtRefreshCookieExtractor, JwtRefreshStrategy } from "./jwt-refresh.strategy";

describe("jwtRefreshCookieExtractor", () => {
  it("returns the refresh token when the cookie is present", () => {
    const req = { cookies: { [REFRESH_TOKEN_COOKIE]: "good-refresh-token" } } as unknown as Request;

    expect(jwtRefreshCookieExtractor(req)).toBe("good-refresh-token");
  });

  it("returns null when the cookie is absent", () => {
    const req = { cookies: {} } as unknown as Request;

    expect(jwtRefreshCookieExtractor(req)).toBeNull();
  });

  it("returns null when req.cookies itself is undefined", () => {
    const req = {} as unknown as Request;

    expect(jwtRefreshCookieExtractor(req)).toBeNull();
  });

  it("returns null when the cookie value isn't a non-empty string", () => {
    const req = { cookies: { [REFRESH_TOKEN_COOKIE]: "" } } as unknown as Request;

    expect(jwtRefreshCookieExtractor(req)).toBeNull();
  });
});

describe("JwtRefreshStrategy", () => {
  let configService: { get: jest.Mock };
  let strategy: JwtRefreshStrategy;

  beforeEach(() => {
    configService = { get: jest.fn().mockReturnValue("refresh-secret") };
    strategy = new JwtRefreshStrategy(configService as unknown as ConfigService<EnvironmentVariables, true>);
  });

  it("reads the secret from JWT_REFRESH_SECRET", () => {
    expect(configService.get).toHaveBeenCalledWith("JWT_REFRESH_SECRET", { infer: true });
  });

  it("validate() returns the payload unchanged (pass-through, no DB hit)", () => {
    const payload: RefreshTokenPayload = { sub: "user-1", rememberMe: true };

    expect(strategy.validate(payload)).toEqual(payload);
  });
});
