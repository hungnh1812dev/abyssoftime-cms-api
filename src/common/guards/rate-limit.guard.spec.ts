import { type ExecutionContext, HttpException } from "@nestjs/common";
import { type ConfigService } from "@nestjs/config";

import { type EnvironmentVariables } from "@/config/env.validation";

import { RateLimitGuard } from "./rate-limit.guard";

describe("RateLimitGuard", () => {
  let configService: { get: jest.Mock };
  let guard: RateLimitGuard;
  let nowMs: number;

  const contextForIp = (ip: string): ExecutionContext =>
    ({
      switchToHttp: () => ({ getRequest: () => ({ ip }) }),
    }) as unknown as ExecutionContext;

  beforeEach(() => {
    nowMs = 1_000_000;
    jest.spyOn(Date, "now").mockImplementation(() => nowMs);

    configService = {
      get: jest.fn((key: string) => {
        if (key === "RATE_LIMIT_FPS") return 1;
        if (key === "RATE_LIMIT_BURST") return 3;
        throw new Error(`unexpected config key "${key}"`);
      }),
    };

    guard = new RateLimitGuard(configService as unknown as ConfigService<EnvironmentVariables, true>);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("allows requests up to the burst limit", () => {
    const context = contextForIp("1.2.3.4");

    expect(guard.canActivate(context)).toBe(true);
    expect(guard.canActivate(context)).toBe(true);
    expect(guard.canActivate(context)).toBe(true);
  });

  it("throws once the burst limit is exceeded within the same instant", () => {
    const context = contextForIp("1.2.3.4");
    guard.canActivate(context);
    guard.canActivate(context);
    guard.canActivate(context);

    expect(() => guard.canActivate(context)).toThrow(HttpException);
  });

  it("refills tokens over time at the configured rate", () => {
    const context = contextForIp("1.2.3.4");
    guard.canActivate(context);
    guard.canActivate(context);
    guard.canActivate(context);
    expect(() => guard.canActivate(context)).toThrow(HttpException);

    nowMs += 1000;

    expect(guard.canActivate(context)).toBe(true);
  });

  it("tracks separate buckets per request key", () => {
    const first = contextForIp("1.2.3.4");
    const second = contextForIp("5.6.7.8");

    guard.canActivate(first);
    guard.canActivate(first);
    guard.canActivate(first);
    expect(() => guard.canActivate(first)).toThrow(HttpException);

    expect(guard.canActivate(second)).toBe(true);
  });
});
