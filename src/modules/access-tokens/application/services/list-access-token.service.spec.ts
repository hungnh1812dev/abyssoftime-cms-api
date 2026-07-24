import { AccessTokenEntity } from "../../domain/entities/access-token.entity";
import { ACCESS_TOKEN_REPOSITORY, IAccessTokenRepository } from "../../domain/repositories/access-token.repository";

import { Test } from "@nestjs/testing";

import { ListAccessTokensService } from "./list-access-token.service";

describe("ListAccessTokensService", () => {
  let service: ListAccessTokensService;
  let accessTokens: jest.Mocked<IAccessTokenRepository>;

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
      providers: [ListAccessTokensService, { provide: ACCESS_TOKEN_REPOSITORY, useValue: accessTokens }],
    }).compile();

    service = module.get(ListAccessTokensService);
  });

  it("returns all access tokens from the repository", async () => {
    const list = [new AccessTokenEntity("token-1", "CI deploy token", "hash", [], null, new Date(), new Date(), "")];
    accessTokens.findAll.mockResolvedValue(list);

    const result = await service.execute();

    expect(accessTokens.findAll).toHaveBeenCalled();
    expect(result).toBe(list);
  });
});
