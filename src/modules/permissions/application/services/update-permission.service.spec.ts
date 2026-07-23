import { NotFoundException } from "@nestjs/common";
import { Test } from "@nestjs/testing";

import { PermissionEntity } from "../../domain/entities/permission.entity";
import { IPermissionRepository, PERMISSSION_REPOSITORY } from "../../domain/repositories/permission.repository";
import { UpdatePermissionDto } from "../dto/update-permission.dto";
import { UpdatePermissionService } from "./update-permission.service";

describe("UpdatePermissionService", () => {
  let service: UpdatePermissionService;
  let repo: jest.Mocked<IPermissionRepository>;

  const existing = new PermissionEntity("permission-1", "document:read", "Read document", "Allows reading a document", new Date(), new Date(), "");
  const updated = new PermissionEntity("permission-1", "document:read", "Read document v2", "Updated description", new Date(), new Date(), "");

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
      providers: [UpdatePermissionService, { provide: PERMISSSION_REPOSITORY, useValue: repo }],
    }).compile();

    service = module.get(UpdatePermissionService);
  });

  it("throws NotFoundException when the permission does not exist", async () => {
    repo.findByIds.mockResolvedValue([]);

    await expect(service.execute("missing", {})).rejects.toThrow(NotFoundException);
    expect(repo.update).not.toHaveBeenCalled();
  });

  it("updates the permission via the repository", async () => {
    repo.findByIds.mockResolvedValue([existing]);
    repo.update.mockResolvedValue(updated);

    const dto: UpdatePermissionDto = { name: "Read document v2", description: "Updated description" };
    const result = await service.execute("permission-1", dto);

    expect(repo.findByIds).toHaveBeenCalledWith(["permission-1"]);
    expect(repo.update).toHaveBeenCalledWith("permission-1", { name: dto.name, description: dto.description, updatedBy: "" });
    expect(result).toBe(updated);
  });
});
