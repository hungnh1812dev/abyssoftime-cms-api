import { ACCESS_TOKEN_COOKIE } from "../guards/jwt-auth.guard";
import { type AccessTokenPayload } from "../types/jwt-payload";
import { type Request } from "express";

import { type ConfigService } from "@nestjs/config";

import { type EnvironmentVariables } from "@/config/env.validation";

import { jwtCookieExtractor, JwtStrategy } from "./jwt.strategy";

describe("jwtCookieExtractor", () => {
  it("returns the access token when the cookie is present", () => {
    const req = { cookies: { [ACCESS_TOKEN_COOKIE]: "good-token" } } as unknown as Request;

    expect(jwtCookieExtractor(req)).toBe("good-token");
  });

  it("returns null when the cookie is absent", () => {
    const req = { cookies: {} } as unknown as Request;

    expect(jwtCookieExtractor(req)).toBeNull();
  });

  it("returns null when req.cookies itself is undefined", () => {
    const req = {} as unknown as Request;

    expect(jwtCookieExtractor(req)).toBeNull();
  });

  it("returns null when the cookie value isn't a non-empty string", () => {
    const req = { cookies: { [ACCESS_TOKEN_COOKIE]: "" } } as unknown as Request;

    expect(jwtCookieExtractor(req)).toBeNull();
  });
});

describe("JwtStrategy", () => {
  let configService: { get: jest.Mock };
  let strategy: JwtStrategy;

  beforeEach(() => {
    configService = { get: jest.fn().mockReturnValue("access-secret") };
    strategy = new JwtStrategy(configService as unknown as ConfigService<EnvironmentVariables, true>);
  });

  it("reads the secret from JWT_ACCESS_SECRET", () => {
    expect(configService.get).toHaveBeenCalledWith("JWT_ACCESS_SECRET", { infer: true });
  });

  it("validate() returns the payload unchanged (pass-through, no DB hit)", () => {
    const payload: AccessTokenPayload = { sub: "user-1", roleSlug: "admin", level: 50, permissions: ["role:read"] };

    expect(strategy.validate(payload)).toEqual(payload);
  });
});
