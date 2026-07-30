import { PermissionEntity } from "../../domain/entities/permission.entity";
import { IPermissionRepository, PERMISSSION_REPOSITORY } from "../../domain/repositories/permission.repository";

import { Test } from "@nestjs/testing";

import { ListPermissionService } from "./list-permission.service";

describe("ListPermissionService", () => {
  let service: ListPermissionService;
  let repo: jest.Mocked<IPermissionRepository>;

  beforeEach(async () => {
    repo = {
      findAll: jest.fn(),
      findBySlug: jest.fn(),
      findByIds: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      countReferences: jest.fn(),
    };

    const module = await Test.createTestingModule({
      providers: [ListPermissionService, { provide: PERMISSSION_REPOSITORY, useValue: repo }],
    }).compile();

    service = module.get(ListPermissionService);
  });

  it("returns all permissions from the repository", async () => {
    const permissions = [new PermissionEntity("permission-1", "document:read", "Read document", "Allows reading a document", new Date(), new Date(), "")];
    repo.findAll.mockResolvedValue(permissions);

    const result = await service.execute();

    expect(repo.findAll).toHaveBeenCalled();
    expect(result).toBe(permissions);
  });
});
