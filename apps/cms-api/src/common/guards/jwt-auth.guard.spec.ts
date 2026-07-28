import { type AccessTokenPayload } from "../types/jwt-payload";

import { UnauthorizedException } from "@nestjs/common";

import { JwtAuthGuard } from "./jwt-auth.guard";

// The guard is now an AuthGuard("jwt") subclass — canActivate() itself is inherited framework code
// (@nestjs/passport), not this repo's. The only repo-owned logic left is handleRequest(), so that's
// what's tested here, in isolation, with synthetic err/user/info args rather than driving the full
// Passport authenticate() chain.
describe("JwtAuthGuard.handleRequest", () => {
  let guard: JwtAuthGuard;

  const payload: AccessTokenPayload = { sub: "user-1", roleSlug: "admin", level: 50, permissions: ["role:read"] };

  beforeEach(() => {
    guard = new JwtAuthGuard();
  });

  it('throws "Missing access token" when passport-jwt reports no token was found', () => {
    expect(() => guard.handleRequest(null, false, new Error("No auth token"))).toThrow(new UnauthorizedException("Missing access token"));
  });

  it('throws "Invalid or expired access token" when the token fails verification (info is a JWT error)', () => {
    expect(() => guard.handleRequest(null, false, new Error("jwt expired"))).toThrow(new UnauthorizedException("Invalid or expired access token"));
  });

  it('throws "Invalid or expired access token" when passport passes an err', () => {
    expect(() => guard.handleRequest(new Error("boom"), false, null)).toThrow(new UnauthorizedException("Invalid or expired access token"));
  });

  it('throws "Invalid or expired access token" when there is no user and no info at all', () => {
    expect(() => guard.handleRequest(null, false, null)).toThrow(new UnauthorizedException("Invalid or expired access token"));
  });

  it("returns the verified payload unchanged when authentication succeeds", () => {
    expect(guard.handleRequest(null, payload, null)).toEqual(payload);
  });
});
