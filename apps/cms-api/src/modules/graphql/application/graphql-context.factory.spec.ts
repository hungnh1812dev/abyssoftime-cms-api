import { type Request } from "express";
import { createHash } from "node:crypto";

import { AccessTokenEntity } from "@/modules/access-tokens/domain/entities/access-token.entity";
import { type IAccessTokenRepository } from "@/modules/access-tokens/domain/repositories/access-token.repository";
import { MediaAssetEntity } from "@/modules/media/domain/entities/media-asset.entity";
import { type IMediaAssetRepository } from "@/modules/media/domain/repositories/media-asset.repository";

import { GraphqlContextFactory } from "./graphql-context.factory";

describe("GraphqlContextFactory", () => {
  let accessTokens: jest.Mocked<IAccessTokenRepository>;
  let mediaAssets: jest.Mocked<IMediaAssetRepository>;
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
    mediaAssets = {
      findAll: jest.fn(),
      findById: jest.fn(),
      findByDocumentIds: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
    };
    factory = new GraphqlContextFactory(accessTokens, mediaAssets);
  });

  it("resolves { apiToken: null } when the authorization header is missing, never throws", async () => {
    await expect(factory.createContext(requestWith({}))).resolves.toEqual(expect.objectContaining({ apiToken: null }));
    expect(accessTokens.findByTokenHash).not.toHaveBeenCalled();
  });

  it("resolves { apiToken: null } when the header is malformed (no Bearer prefix)", async () => {
    await expect(factory.createContext(requestWith({ authorization: plaintext }))).resolves.toEqual(expect.objectContaining({ apiToken: null }));
    expect(accessTokens.findByTokenHash).not.toHaveBeenCalled();
  });

  it("resolves { apiToken: null } when the token hash is unknown", async () => {
    accessTokens.findByTokenHash.mockResolvedValue(null);

    await expect(factory.createContext(requestWith({ authorization: `Bearer ${plaintext}` }))).resolves.toEqual(expect.objectContaining({ apiToken: null }));
    expect(accessTokens.findByTokenHash).toHaveBeenCalledWith(hash);
  });

  it("resolves { apiToken: null } when the token is expired", async () => {
    const expired = new AccessTokenEntity("token-1", "CI", hash, [], new Date(Date.now() - 1000), new Date(), new Date(), null);
    accessTokens.findByTokenHash.mockResolvedValue(expired);

    await expect(factory.createContext(requestWith({ authorization: `Bearer ${plaintext}` }))).resolves.toEqual(expect.objectContaining({ apiToken: null }));
  });

  it("resolves the token payload when valid and non-expired", async () => {
    const valid = new AccessTokenEntity("token-1", "CI", hash, ["document:read"], new Date(Date.now() + 60_000), new Date(), new Date(), null);
    accessTokens.findByTokenHash.mockResolvedValue(valid);

    await expect(factory.createContext(requestWith({ authorization: `Bearer ${plaintext}` }))).resolves.toEqual(
      expect.objectContaining({
        apiToken: { documentId: "token-1", name: "CI", permissions: ["document:read"] },
      }),
    );
  });

  it("resolves the token payload for a never-expiring token (expiresAt: null)", async () => {
    const neverExpires = new AccessTokenEntity("token-1", "CI", hash, [], null, new Date(), new Date(), null);
    accessTokens.findByTokenHash.mockResolvedValue(neverExpires);

    await expect(factory.createContext(requestWith({ authorization: `Bearer ${plaintext}` }))).resolves.toEqual(
      expect.objectContaining({
        apiToken: { documentId: "token-1", name: "CI", permissions: [] },
      }),
    );
  });

  it("attaches a mediaAssetLoader to the context", async () => {
    const context = await factory.createContext(requestWith({}));

    expect(context.mediaAssetLoader).toBeDefined();
  });

  it("builds a fresh mediaAssetLoader instance on every call (never shared across requests)", async () => {
    const first = await factory.createContext(requestWith({}));
    const second = await factory.createContext(requestWith({}));

    expect(first.mediaAssetLoader).not.toBe(second.mediaAssetLoader);
  });

  it("mediaAssetLoader.load(id) resolves the matching MediaAssetEntity via a batched findByDocumentIds call", async () => {
    const asset = new MediaAssetEntity(
      "media-1",
      "photo.png",
      "image/png",
      1024,
      800,
      600,
      "https://cdn/x",
      "https://cdn/x-thumb",
      "photo",
      "abc123",
      null,
      new Date(),
      new Date(),
    );
    mediaAssets.findByDocumentIds.mockResolvedValue([asset]);

    const context = await factory.createContext(requestWith({}));
    const result = await context.mediaAssetLoader.load("media-1");

    expect(result).toBe(asset);
    expect(mediaAssets.findByDocumentIds).toHaveBeenCalledWith(["media-1"]);
  });

  it("mediaAssetLoader.load(id) resolves null (not a rejection) for an id with no matching asset", async () => {
    mediaAssets.findByDocumentIds.mockResolvedValue([]);

    const context = await factory.createContext(requestWith({}));

    await expect(context.mediaAssetLoader.load("missing")).resolves.toBeNull();
  });

  it("batches concurrent load() calls issued in the same tick into one findByDocumentIds call", async () => {
    const assetOne = new MediaAssetEntity("media-1", "a.png", "image/png", 1, 1, 1, "u1", "t1", "p1", "h1", null, new Date(), new Date());
    const assetTwo = new MediaAssetEntity("media-2", "b.png", "image/png", 1, 1, 1, "u2", "t2", "p2", "h2", null, new Date(), new Date());
    mediaAssets.findByDocumentIds.mockResolvedValue([assetOne, assetTwo]);

    const context = await factory.createContext(requestWith({}));
    const [resultOne, resultTwo] = await Promise.all([context.mediaAssetLoader.load("media-1"), context.mediaAssetLoader.load("media-2")]);

    expect(resultOne).toBe(assetOne);
    expect(resultTwo).toBe(assetTwo);
    expect(mediaAssets.findByDocumentIds).toHaveBeenCalledTimes(1);
    expect(mediaAssets.findByDocumentIds).toHaveBeenCalledWith(["media-1", "media-2"]);
  });
});
