import { CreateAccessTokenDto } from "../application/dto/create-access-token.dto";
import { CreateAccessTokenService } from "../application/services/create-access-token.service";
import { AccessTokenEntity } from "../domain/entities/access-token.entity";

import { Test } from "@nestjs/testing";

import { JwtTokenService } from "@/common/token/jwt-token.service";
import { type AuthenticatedRequest } from "@/common/types/authenticated-request";

import { AccessTokenController } from "./access-token.controller";

describe("AccessTokenController", () => {
  let controller: AccessTokenController;
  let createAccessTokenService: jest.Mocked<CreateAccessTokenService>;

  const entity = new AccessTokenEntity("token-1", "CI deploy token", "hash", [], null, new Date(), new Date(), "caller-1");
  const req = { user: { sub: "caller-1" } } as AuthenticatedRequest;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      controllers: [AccessTokenController],
      providers: [
        { provide: CreateAccessTokenService, useValue: { execute: jest.fn() } },
        { provide: JwtTokenService, useValue: { verifyAccessToken: jest.fn() } },
      ],
    }).compile();

    controller = module.get(AccessTokenController);
    createAccessTokenService = module.get(CreateAccessTokenService);
  });

  it("create() delegates to CreateAccessTokenService with the caller id and returns the plaintext token once", async () => {
    const dto: CreateAccessTokenDto = { name: "CI deploy token", permissions: [], expiresIn: "never" };
    createAccessTokenService.execute.mockResolvedValue({ entity, plaintext: "cms_plaintext" });

    const result = await controller.create(dto, req);

    expect(createAccessTokenService.execute).toHaveBeenCalledWith(dto, "caller-1");
    expect(result).toEqual({
      documentId: entity.documentId,
      name: entity.name,
      permissions: entity.permissions,
      expiresAt: entity.expiresAt,
      token: "cms_plaintext",
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    });
  });
});
