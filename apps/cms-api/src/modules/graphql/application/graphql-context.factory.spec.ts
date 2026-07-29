import { type Request } from "express";
import { createHash } from "node:crypto";

import { AccessTokenEntity } from "@/modules/access-tokens/domain/entities/access-token.entity";
import { type IAccessTokenRepository } from "@/modules/access-tokens/domain/repositories/access-token.repository";

import { GraphqlContextFactory } from "./graphql-context.factory";

describe("GraphqlContextFactory", () => {
  let accessTokens: jest.Mocked<IAccessTokenRepository>;
  let factory: GraphqlContextFactory;

  const plaintext = "cms_secret";
  const hash = createHash("sha256").update(plaintext).digest("hex");

  const requestWith = (headers: Record<string, string | undefined>): Request => ({ headers }) as unknown as Request;

  beforeEach(() => {
    accessTokens = {
      findAll: jest.fn(),
      findById: jest.fn(),
      findByTokenHash: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };
    factory = new GraphqlContextFactory(accessTokens);
  });

  it("resolves { apiToken: null } when the authorization header is missing, never throws", async () => {
    await expect(factory.createContext(requestWith({}))).resolves.toEqual({ apiToken: null });
    expect(accessTokens.findByTokenHash).not.toHaveBeenCalled();
  });

  it("resolves { apiToken: null } when the header is malformed (no Bearer prefix)", async () => {
    await expect(factory.createContext(requestWith({ authorization: plaintext }))).resolves.toEqual({ apiToken: null });
    expect(accessTokens.findByTokenHash).not.toHaveBeenCalled();
  });

  it("resolves { apiToken: null } when the token hash is unknown", async () => {
    accessTokens.findByTokenHash.mockResolvedValue(null);

    await expect(factory.createContext(requestWith({ authorization: `Bearer ${plaintext}` }))).resolves.toEqual({ apiToken: null });
    expect(accessTokens.findByTokenHash).toHaveBeenCalledWith(hash);
  });

  it("resolves { apiToken: null } when the token is expired", async () => {
    const expired = new AccessTokenEntity("token-1", "CI", hash, [], new Date(Date.now() - 1000), new Date(), new Date(), null);
    accessTokens.findByTokenHash.mockResolvedValue(expired);

    await expect(factory.createContext(requestWith({ authorization: `Bearer ${plaintext}` }))).resolves.toEqual({ apiToken: null });
  });

  it("resolves the token payload when valid and non-expired", async () => {
    const valid = new AccessTokenEntity("token-1", "CI", hash, ["document:read"], new Date(Date.now() + 60_000), new Date(), new Date(), null);
    accessTokens.findByTokenHash.mockResolvedValue(valid);

    await expect(factory.createContext(requestWith({ authorization: `Bearer ${plaintext}` }))).resolves.toEqual({
      apiToken: { documentId: "token-1", name: "CI", permissions: ["document:read"] },
    });
  });

  it("resolves the token payload for a never-expiring token (expiresAt: null)", async () => {
    const neverExpires = new AccessTokenEntity("token-1", "CI", hash, [], null, new Date(), new Date(), null);
    accessTokens.findByTokenHash.mockResolvedValue(neverExpires);

    await expect(factory.createContext(requestWith({ authorization: `Bearer ${plaintext}` }))).resolves.toEqual({
      apiToken: { documentId: "token-1", name: "CI", permissions: [] },
    });
  });
});
