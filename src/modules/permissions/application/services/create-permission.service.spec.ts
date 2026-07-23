import { ConflictException } from "@nestjs/common";
import { Test } from "@nestjs/testing";

import { PermissionEntity } from "../../domain/entities/permission.entity";
import { IPermissionRepository, PERMISSSION_REPOSITORY } from "../../domain/repositories/permission.repository";
import { CreatePermissionDto } from "../dto/create-permission.dto";
import { CreatePermissionService } from "./create-permission.service";

describe("CreatePermissionService", () => {
  let service: CreatePermissionService;
  let repo: jest.Mocked<IPermissionRepository>;

  const dto: CreatePermissionDto = {
    slug: "document:read",
    name: "Read document",
    description: "Allows reading a document",
  };

  const created = new PermissionEntity("permission-1", dto.slug, dto.name, dto.description, new Date(), new Date(), "");

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
      providers: [CreatePermissionService, { provide: PERMISSSION_REPOSITORY, useValue: repo }],
    }).compile();

    service = module.get(CreatePermissionService);
  });

  it("creates a permission via the repository", async () => {
    repo.findBySlug.mockResolvedValue(null);
    repo.create.mockResolvedValue(created);

    const result = await service.execute(dto);

    expect(repo.create).toHaveBeenCalledWith({ slug: dto.slug, name: dto.name, description: dto.description, updatedBy: "" });
    expect(result).toBe(created);
  });

  it("throws ConflictException when the slug already exists", async () => {
    repo.findBySlug.mockResolvedValue(created);

    await expect(service.execute(dto)).rejects.toThrow(ConflictException);
    expect(repo.create).not.toHaveBeenCalled();
  });
});
