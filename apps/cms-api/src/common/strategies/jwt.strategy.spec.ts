import { type AccessTokenPayload } from "../types/jwt-payload";

import { type ConfigService } from "@nestjs/config";

import { type EnvironmentVariables } from "@/config/env.validation";

import { JwtStrategy } from "./jwt.strategy";

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
