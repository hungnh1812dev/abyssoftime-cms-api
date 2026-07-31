import { type RefreshTokenPayload } from "../types/jwt-payload";

import { UnauthorizedException } from "@nestjs/common";

import { JwtRefreshGuard } from "./jwt-refresh.guard";

// Mirrors jwt-auth.guard.spec.ts: canActivate() is inherited AuthGuard(["jwt-refresh"]) framework
// code, not this repo's. The only repo-owned logic is handleRequest(), tested here in isolation
// with synthetic err/user/info args rather than driving the full Passport authenticate() chain.
describe("JwtRefreshGuard.handleRequest", () => {
  let guard: JwtRefreshGuard;

  const payload: RefreshTokenPayload = { sub: "user-1", rememberMe: false };

  beforeEach(() => {
    guard = new JwtRefreshGuard();
  });

  it('throws "Missing refresh token" when passport-jwt reports no token was found', () => {
    expect(() => guard.handleRequest(null, false, new Error("No auth token"))).toThrow(new UnauthorizedException("Missing refresh token"));
  });

  it('throws "Invalid or expired refresh token" when the token fails verification (info is a JWT error)', () => {
    expect(() => guard.handleRequest(null, false, new Error("jwt expired"))).toThrow(new UnauthorizedException("Invalid or expired refresh token"));
  });

  it('throws "Invalid or expired refresh token" when passport passes an err', () => {
    expect(() => guard.handleRequest(new Error("boom"), false, null)).toThrow(new UnauthorizedException("Invalid or expired refresh token"));
  });

  it('throws "Invalid or expired refresh token" when there is no user and no info at all', () => {
    expect(() => guard.handleRequest(null, false, null)).toThrow(new UnauthorizedException("Invalid or expired refresh token"));
  });

  it("returns the verified payload unchanged when authentication succeeds", () => {
    expect(guard.handleRequest(null, payload, null)).toEqual(payload);
  });
});
