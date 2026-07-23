import { type AccessTokenPayload, type RefreshTokenPayload } from "../types/jwt-payload";

import { type ConfigService } from "@nestjs/config";
import { type JwtService } from "@nestjs/jwt";

import { type EnvironmentVariables } from "@/config/env.validation";

import { JwtTokenService } from "./jwt-token.service";

describe("JwtTokenService", () => {
  let jwtService: jest.Mocked<Pick<JwtService, "sign" | "verify">>;
  let configService: { get: jest.Mock };
  let service: JwtTokenService;

  const accessPayload: AccessTokenPayload = { sub: "user-1", roleSlug: "admin", level: 50, permissions: ["role:read"] };
  const refreshPayload: RefreshTokenPayload = { sub: "user-1" };

  beforeEach(() => {
    jwtService = { sign: jest.fn(), verify: jest.fn() };
    configService = {
      get: jest.fn((key: string) => {
        if (key === "JWT_ACCESS_SECRET") return "access-secret";
        if (key === "JWT_REFRESH_SECRET") return "refresh-secret";
        throw new Error(`unexpected config key "${key}"`);
      }),
    };

    service = new JwtTokenService(jwtService as unknown as JwtService, configService as unknown as ConfigService<EnvironmentVariables, true>);
  });

  it("signAccessToken() signs with the access secret and a 15m expiry", () => {
    jwtService.sign.mockReturnValue("access-token");

    const result = service.signAccessToken(accessPayload);

    expect(jwtService.sign).toHaveBeenCalledWith(accessPayload, { secret: "access-secret", expiresIn: "15m" });
    expect(result).toBe("access-token");
  });

  it("signRefreshToken() signs with the refresh secret and a 7d expiry", () => {
    jwtService.sign.mockReturnValue("refresh-token");

    const result = service.signRefreshToken(refreshPayload);

    expect(jwtService.sign).toHaveBeenCalledWith(refreshPayload, { secret: "refresh-secret", expiresIn: "7d" });
    expect(result).toBe("refresh-token");
  });

  it("verifyAccessToken() verifies with the access secret", () => {
    jwtService.verify.mockReturnValue(accessPayload);

    const result = service.verifyAccessToken("access-token");

    expect(jwtService.verify).toHaveBeenCalledWith("access-token", { secret: "access-secret" });
    expect(result).toEqual(accessPayload);
  });

  it("verifyRefreshToken() verifies with the refresh secret", () => {
    jwtService.verify.mockReturnValue(refreshPayload);

    const result = service.verifyRefreshToken("refresh-token");

    expect(jwtService.verify).toHaveBeenCalledWith("refresh-token", { secret: "refresh-secret" });
    expect(result).toEqual(refreshPayload);
  });
});
