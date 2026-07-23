import { type JwtTokenService } from "../token/jwt-token.service";
import { type AccessTokenPayload } from "../types/jwt-payload";

import { type ExecutionContext, UnauthorizedException } from "@nestjs/common";

import { ACCESS_TOKEN_COOKIE, JwtAuthGuard } from "./jwt-auth.guard";

describe("JwtAuthGuard", () => {
  let tokenService: jest.Mocked<Pick<JwtTokenService, "verifyAccessToken">>;
  let guard: JwtAuthGuard;

  const payload: AccessTokenPayload = { sub: "user-1", roleSlug: "admin", level: 50, permissions: ["role:read"] };

  const contextWithCookies = (cookies: Record<string, string>, request: { cookies: Record<string, string>; user?: AccessTokenPayload } = { cookies }) =>
    ({
      switchToHttp: () => ({ getRequest: () => request }),
    }) as unknown as ExecutionContext;

  beforeEach(() => {
    tokenService = { verifyAccessToken: jest.fn() };
    guard = new JwtAuthGuard(tokenService as unknown as JwtTokenService);
  });

  it("throws UnauthorizedException when the access token cookie is missing", () => {
    expect(() => guard.canActivate(contextWithCookies({}))).toThrow(UnauthorizedException);
  });

  it("throws UnauthorizedException when the access token fails verification", () => {
    tokenService.verifyAccessToken.mockImplementation(() => {
      throw new Error("expired");
    });

    expect(() => guard.canActivate(contextWithCookies({ [ACCESS_TOKEN_COOKIE]: "bad-token" }))).toThrow(UnauthorizedException);
  });

  it("attaches the verified payload to req.user and allows the request", () => {
    tokenService.verifyAccessToken.mockReturnValue(payload);
    const request = { cookies: { [ACCESS_TOKEN_COOKIE]: "good-token" } };

    const result = guard.canActivate(contextWithCookies({}, request));

    expect(tokenService.verifyAccessToken).toHaveBeenCalledWith("good-token");
    expect(result).toBe(true);
    expect((request as { user?: AccessTokenPayload }).user).toEqual(payload);
  });
});
