import { ConflictException, NotFoundException } from "@nestjs/common";
import { Test } from "@nestjs/testing";

import { PermissionEntity } from "../../domain/entities/permission.entity";
import { IPermissionRepository, PERMISSSION_REPOSITORY } from "../../domain/repositories/permission.repository";
import { DeletePermissionService } from "./delete-permission.service";

describe("DeletePermissionService", () => {
  let service: DeletePermissionService;
  let repo: jest.Mocked<IPermissionRepository>;

  const existing = new PermissionEntity("permission-1", "document:read", "Read document", "Allows reading a document", new Date(), new Date(), "");

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
      providers: [DeletePermissionService, { provide: PERMISSSION_REPOSITORY, useValue: repo }],
    }).compile();

    service = module.get(DeletePermissionService);
  });

  it("throws NotFoundException when the permission does not exist", async () => {
    repo.findByIds.mockResolvedValue([]);

    await expect(service.execute("missing")).rejects.toThrow(NotFoundException);
    expect(repo.delete).not.toHaveBeenCalled();
  });

  it("throws ConflictException when the permission is still assigned to roles", async () => {
    repo.findByIds.mockResolvedValue([existing]);
    repo.countReferences.mockResolvedValue({ roleCount: 2, accessTokenCount: 0 });

    await expect(service.execute("permission-1")).rejects.toThrow(ConflictException);
    expect(repo.delete).not.toHaveBeenCalled();
  });

  it("throws ConflictException when the permission is still referenced by access tokens", async () => {
    repo.findByIds.mockResolvedValue([existing]);
    repo.countReferences.mockResolvedValue({ roleCount: 0, accessTokenCount: 1 });

    await expect(service.execute("permission-1")).rejects.toThrow(ConflictException);
    expect(repo.delete).not.toHaveBeenCalled();
  });

  it("deletes the permission when it has no references", async () => {
    repo.findByIds.mockResolvedValue([existing]);
    repo.countReferences.mockResolvedValue({ roleCount: 0, accessTokenCount: 0 });
    repo.delete.mockResolvedValue(undefined);

    await service.execute("permission-1");

    expect(repo.countReferences).toHaveBeenCalledWith(existing.slug);
    expect(repo.delete).toHaveBeenCalledWith("permission-1");
  });
});
