import { AccessTokenEntity } from "../../domain/entities/access-token.entity";
import { ACCESS_TOKEN_REPOSITORY, IAccessTokenRepository } from "../../domain/repositories/access-token.repository";

import { NotFoundException } from "@nestjs/common";
import { Test } from "@nestjs/testing";

import { DeleteAccessTokenService } from "./delete-access-token.service";

describe("DeleteAccessTokenService", () => {
  let service: DeleteAccessTokenService;
  let accessTokens: jest.Mocked<IAccessTokenRepository>;

  const existing = new AccessTokenEntity("token-1", "CI deploy token", "hash", [], null, new Date(), new Date(), "");

  beforeEach(async () => {
    accessTokens = {
      findAll: jest.fn(),
      findById: jest.fn(),
      findByTokenHash: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };

    const module = await Test.createTestingModule({
      providers: [DeleteAccessTokenService, { provide: ACCESS_TOKEN_REPOSITORY, useValue: accessTokens }],
    }).compile();

    service = module.get(DeleteAccessTokenService);
  });

  it("throws NotFoundException when the target access token does not exist", async () => {
    accessTokens.findById.mockResolvedValue(null);

    await expect(service.execute("missing")).rejects.toThrow(NotFoundException);
    expect(accessTokens.delete).not.toHaveBeenCalled();
  });

  it("deletes the access token via the repository (happy path)", async () => {
    accessTokens.findById.mockResolvedValue(existing);
    accessTokens.delete.mockResolvedValue(undefined);

    await service.execute("token-1");

    expect(accessTokens.delete).toHaveBeenCalledWith("token-1");
  });

  it("throws NotFoundException on re-delete of an already-deleted token", async () => {
    accessTokens.findById.mockResolvedValue(null);

    await expect(service.execute("token-1")).rejects.toThrow(NotFoundException);
    expect(accessTokens.delete).not.toHaveBeenCalled();
  });
});
