import { AccessTokenEntity } from "../../domain/entities/access-token.entity";
import { ACCESS_TOKEN_REPOSITORY, IAccessTokenRepository } from "../../domain/repositories/access-token.repository";
import { CreateAccessTokenDto } from "../dto/create-access-token.dto";

import { BadRequestException } from "@nestjs/common";
import { Test } from "@nestjs/testing";

import { PermissionEntity } from "@/modules/permissions/domain/entities/permission.entity";
import { IPermissionRepository, PERMISSSION_REPOSITORY } from "@/modules/permissions/domain/repositories/permission.repository";

import { CreateAccessTokenService } from "./create-access-token.service";

describe("CreateAccessTokenService", () => {
  let service: CreateAccessTokenService;
  let accessTokens: jest.Mocked<IAccessTokenRepository>;
  let permissions: jest.Mocked<IPermissionRepository>;

  const catalog = [new PermissionEntity("permission-1", "document:read", "Read document", "Allows reading a document", new Date(), new Date(), "")];
  const dto: CreateAccessTokenDto = { name: "CI deploy token", permissions: [], expiresIn: "never" };
  const created = new AccessTokenEntity("token-1", dto.name, "hash", [], null, new Date(), new Date(), "caller-1");

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
      providers: [CreateAccessTokenService, { provide: ACCESS_TOKEN_REPOSITORY, useValue: accessTokens }, { provide: PERMISSSION_REPOSITORY, useValue: permissions }],
    }).compile();

    service = module.get(CreateAccessTokenService);
  });

  it("skips the permission catalog check when permissions is empty", async () => {
    accessTokens.create.mockResolvedValue(created);

    await service.execute(dto, "caller-1");

    expect(permissions.findAll).not.toHaveBeenCalled();
    expect(accessTokens.create).toHaveBeenCalled();
  });

  it("throws BadRequestException when permissions include an unknown slug", async () => {
    permissions.findAll.mockResolvedValue(catalog);

    await expect(service.execute({ ...dto, permissions: ["document:delete"] }, "caller-1")).rejects.toThrow(BadRequestException);
    expect(accessTokens.create).not.toHaveBeenCalled();
  });

  it("passes a 64-hex-char hash (not the cms_ plaintext) to the repository", async () => {
    accessTokens.create.mockResolvedValue(created);

    await service.execute(dto, "caller-1");

    const [callArgs] = accessTokens.create.mock.calls[0] as [{ token: string }];
    expect(callArgs.token).toMatch(/^[0-9a-f]{64}$/);
  });

  it("returns a plaintext token starting with cms_ that is 68 characters total", async () => {
    accessTokens.create.mockResolvedValue(created);

    const result = await service.execute(dto, "caller-1");

    expect(result.plaintext.startsWith("cms_")).toBe(true);
    expect(result.plaintext).toHaveLength(68);
  });

  it('resolves expiresAt to null when expiresIn is "never"', async () => {
    accessTokens.create.mockResolvedValue(created);

    await service.execute({ ...dto, expiresIn: "never" }, "caller-1");

    const [callArgs] = accessTokens.create.mock.calls[0] as [{ expiresAt: Date | null }];
    expect(callArgs.expiresAt).toBeNull();
  });

  it('resolves expiresAt to roughly now + 1 hour when expiresIn is "1h"', async () => {
    accessTokens.create.mockResolvedValue(created);

    const before = Date.now();
    await service.execute({ ...dto, expiresIn: "1h" }, "caller-1");
    const after = Date.now();

    const [callArgs] = accessTokens.create.mock.calls[0] as [{ expiresAt: Date }];
    expect(callArgs.expiresAt.getTime()).toBeGreaterThanOrEqual(before + 3_600_000);
    expect(callArgs.expiresAt.getTime()).toBeLessThanOrEqual(after + 3_600_000);
  });

  it("passes callerId through as updatedBy and returns the created entity", async () => {
    accessTokens.create.mockResolvedValue(created);

    const result = await service.execute(dto, "caller-1");

    const [callArgs] = accessTokens.create.mock.calls[0] as [{ updatedBy: string | null }];
    expect(callArgs.updatedBy).toBe("caller-1");
    expect(result.entity).toBe(created);
  });
});
