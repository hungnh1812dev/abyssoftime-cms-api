import { type AuthenticatedRequest } from "../types/authenticated-request";
import { createHash } from "node:crypto";

import { type ExecutionContext, UnauthorizedException } from "@nestjs/common";

import { AccessTokenEntity } from "@/modules/access-tokens/domain/entities/access-token.entity";
import { type IAccessTokenRepository } from "@/modules/access-tokens/domain/repositories/access-token.repository";

import { ApiTokenGuard } from "./api-token.guard";

describe("ApiTokenGuard", () => {
  let accessTokens: jest.Mocked<IAccessTokenRepository>;
  let guard: ApiTokenGuard;

  const plaintext = "cms_secret";
  const hash = createHash("sha256").update(plaintext).digest("hex");

  const contextWithRequest = (request: Partial<AuthenticatedRequest>) =>
    ({
      switchToHttp: () => ({ getRequest: () => request }),
    }) as unknown as ExecutionContext;

  beforeEach(() => {
    accessTokens = {
      findAll: jest.fn(),
      findById: jest.fn(),
      findByTokenHash: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };
    guard = new ApiTokenGuard(accessTokens);
  });

  it("throws UnauthorizedException when the authorization header is missing", async () => {
    await expect(guard.canActivate(contextWithRequest({ headers: {} }))).rejects.toThrow(UnauthorizedException);
    expect(accessTokens.findByTokenHash).not.toHaveBeenCalled();
  });

  it("throws UnauthorizedException when the header is malformed (no Bearer prefix)", async () => {
    await expect(guard.canActivate(contextWithRequest({ headers: { authorization: plaintext } }))).rejects.toThrow(UnauthorizedException);
    expect(accessTokens.findByTokenHash).not.toHaveBeenCalled();
  });

  it("throws UnauthorizedException when the token hash is unknown", async () => {
    accessTokens.findByTokenHash.mockResolvedValue(null);

    await expect(guard.canActivate(contextWithRequest({ headers: { authorization: `Bearer ${plaintext}` } }))).rejects.toThrow(UnauthorizedException);
    expect(accessTokens.findByTokenHash).toHaveBeenCalledWith(hash);
  });

  it("throws UnauthorizedException when the token is expired", async () => {
    const expired = new AccessTokenEntity("token-1", "CI", hash, [], new Date(Date.now() - 1000), new Date(), new Date(), null);
    accessTokens.findByTokenHash.mockResolvedValue(expired);

    await expect(guard.canActivate(contextWithRequest({ headers: { authorization: `Bearer ${plaintext}` } }))).rejects.toThrow(UnauthorizedException);
  });

  it("attaches the token payload to request.apiToken and allows the request when valid and non-expired", async () => {
    const valid = new AccessTokenEntity("token-1", "CI", hash, ["document:read"], new Date(Date.now() + 60_000), new Date(), new Date(), null);
    accessTokens.findByTokenHash.mockResolvedValue(valid);
    const request: Partial<AuthenticatedRequest> = { headers: { authorization: `Bearer ${plaintext}` } };

    const result = await guard.canActivate(contextWithRequest(request));

    expect(result).toBe(true);
    expect(request.apiToken).toEqual({ documentId: "token-1", name: "CI", permissions: ["document:read"] });
  });

  it("allows a never-expiring token (expiresAt: null) regardless of the current time", async () => {
    const neverExpires = new AccessTokenEntity("token-1", "CI", hash, [], null, new Date(), new Date(), null);
    accessTokens.findByTokenHash.mockResolvedValue(neverExpires);

    const result = await guard.canActivate(contextWithRequest({ headers: { authorization: `Bearer ${plaintext}` } }));

    expect(result).toBe(true);
  });
});
