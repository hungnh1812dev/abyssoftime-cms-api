import { AccessTokenEntity } from "../../domain/entities/access-token.entity";
import { ACCESS_TOKEN_REPOSITORY, IAccessTokenRepository } from "../../domain/repositories/access-token.repository";
import { RevokeAccessTokenDto } from "../dto/revoke-access-token.dto";

import { BadRequestException, NotFoundException } from "@nestjs/common";
import { Test } from "@nestjs/testing";

import { PermissionEntity } from "@/modules/permissions/domain/entities/permission.entity";
import { IPermissionRepository, PERMISSSION_REPOSITORY } from "@/modules/permissions/domain/repositories/permission.repository";

import { RevokeAccessTokenService } from "./revoke-access-token.service";

describe("RevokeAccessTokenService", () => {
  let service: RevokeAccessTokenService;
  let accessTokens: jest.Mocked<IAccessTokenRepository>;
  let permissions: jest.Mocked<IPermissionRepository>;

  const catalog = [new PermissionEntity("permission-1", "document:read", "Read document", "Allows reading a document", new Date(), new Date(), "")];
  const existing = new AccessTokenEntity("token-1", "CI deploy token", "old-hash", ["document:read"], null, new Date(), new Date(), "caller-0");
  const updated = new AccessTokenEntity("token-1", "CI deploy token", "new-hash", ["document:read"], null, new Date(), new Date(), "caller-1");

  beforeEach(async () => {
    accessTokens = {
      findAll: jest.fn(),
      findById: jest.fn(),
      findByTokenHash: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };
    permissions = {
      findAll: jest.fn(),
      findBySlug: jest.fn(),
      findByIds: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      countReferences: jest.fn(),
    };

    const module = await Test.createTestingModule({
      providers: [RevokeAccessTokenService, { provide: ACCESS_TOKEN_REPOSITORY, useValue: accessTokens }, { provide: PERMISSSION_REPOSITORY, useValue: permissions }],
    }).compile();

    service = module.get(RevokeAccessTokenService);
  });

  it("throws NotFoundException when the access token does not exist", async () => {
    accessTokens.findById.mockResolvedValue(null);

    await expect(service.execute("missing", {}, "caller-1")).rejects.toThrow(NotFoundException);
    expect(accessTokens.update).not.toHaveBeenCalled();
  });

  it("rotates the secret even with an empty dto", async () => {
    accessTokens.findById.mockResolvedValue(existing);
    accessTokens.update.mockResolvedValue(updated);

    const result = await service.execute("token-1", {}, "caller-1");

    const [, callArgs] = accessTokens.update.mock.calls[0] as [string, { token: string }];
    expect(callArgs.token).toMatch(/^[0-9a-f]{64}$/);
    expect(callArgs.token).not.toBe(existing.token);
    expect(result.plaintext.startsWith("cms_")).toBe(true);
  });

  it("preserves name, permissions, and expiresAt from the existing entity when omitted", async () => {
    accessTokens.findById.mockResolvedValue(existing);
    accessTokens.update.mockResolvedValue(updated);

    await service.execute("token-1", {}, "caller-1");

    const [, callArgs] = accessTokens.update.mock.calls[0] as [string, { name: string; permissions: string[]; expiresAt: Date | null }];
    expect(callArgs.name).toBe(existing.name);
    expect(callArgs.permissions).toBe(existing.permissions);
    expect(callArgs.expiresAt).toBe(existing.expiresAt);
  });

  it("applies name/permissions/expiresIn overrides when provided", async () => {
    accessTokens.findById.mockResolvedValue(existing);
    accessTokens.update.mockResolvedValue(updated);
    permissions.findAll.mockResolvedValue(catalog);

    const dto: RevokeAccessTokenDto = { name: "renamed", permissions: ["document:read"], expiresIn: "1h" };
    const before = Date.now();
    await service.execute("token-1", dto, "caller-1");
    const after = Date.now();

    const [, callArgs] = accessTokens.update.mock.calls[0] as [string, { name: string; permissions: string[]; expiresAt: Date }];
    expect(callArgs.name).toBe("renamed");
    expect(callArgs.permissions).toEqual(["document:read"]);
    expect(callArgs.expiresAt.getTime()).toBeGreaterThanOrEqual(before + 3_600_000);
    expect(callArgs.expiresAt.getTime()).toBeLessThanOrEqual(after + 3_600_000);
  });

  it("skips the permission catalog check when permissions is an empty array", async () => {
    accessTokens.findById.mockResolvedValue(existing);
    accessTokens.update.mockResolvedValue(updated);

    await service.execute("token-1", { permissions: [] }, "caller-1");

    expect(permissions.findAll).not.toHaveBeenCalled();
    expect(accessTokens.update).toHaveBeenCalled();
  });

  it("throws BadRequestException for an unknown permission slug and never rotates the secret", async () => {
    accessTokens.findById.mockResolvedValue(existing);
    permissions.findAll.mockResolvedValue(catalog);

    await expect(service.execute("token-1", { permissions: ["document:delete"] }, "caller-1")).rejects.toThrow(BadRequestException);
    expect(accessTokens.update).not.toHaveBeenCalled();
  });

  it("passes callerId through as updatedBy and returns the updated entity", async () => {
    accessTokens.findById.mockResolvedValue(existing);
    accessTokens.update.mockResolvedValue(updated);

    const result = await service.execute("token-1", {}, "caller-1");

    const [, callArgs] = accessTokens.update.mock.calls[0] as [string, { updatedBy: string | null }];
    expect(callArgs.updatedBy).toBe("caller-1");
    expect(result.entity).toBe(updated);
  });
});
