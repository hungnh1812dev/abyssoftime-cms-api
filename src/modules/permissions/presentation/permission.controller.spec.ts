import { Test } from "@nestjs/testing";

import { CreatePermissionDto } from "../application/dto/create-permission.dto";
import { UpdatePermissionDto } from "../application/dto/update-permission.dto";
import { CreatePermissionService } from "../application/services/create-permission.service";
import { DeletePermissionService } from "../application/services/delete-permission.service";
import { ListPermissionService } from "../application/services/list-permission.service";
import { UpdatePermissionService } from "../application/services/update-permission.service";
import { PermissionEntity } from "../domain/entities/permission.entity";
import { PermissionController } from "./permission.controller";

describe("PermissionController", () => {
  let controller: PermissionController;
  let listPermissions: jest.Mocked<ListPermissionService>;
  let createPermission: jest.Mocked<CreatePermissionService>;
  let updatePermission: jest.Mocked<UpdatePermissionService>;
  let deletePermission: jest.Mocked<DeletePermissionService>;

  const permission = new PermissionEntity("permission-1", "document:read", "Read document", "Allows reading a document", new Date(), new Date(), "");

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      controllers: [PermissionController],
      providers: [
        { provide: ListPermissionService, useValue: { execute: jest.fn() } },
        { provide: CreatePermissionService, useValue: { execute: jest.fn() } },
        { provide: UpdatePermissionService, useValue: { execute: jest.fn() } },
        { provide: DeletePermissionService, useValue: { execute: jest.fn() } },
      ],
    }).compile();

    controller = module.get(PermissionController);
    listPermissions = module.get(ListPermissionService);
    createPermission = module.get(CreatePermissionService);
    updatePermission = module.get(UpdatePermissionService);
    deletePermission = module.get(DeletePermissionService);
  });

  it("list() delegates to ListPermissionService", async () => {
    listPermissions.execute.mockResolvedValue([permission]);

    const result = await controller.list();

    expect(listPermissions.execute).toHaveBeenCalled();
    expect(result).toEqual([permission]);
  });

  it("create() delegates to CreatePermissionService", async () => {
    const dto: CreatePermissionDto = { slug: "document:read", name: "Read document", description: "Allows reading a document" };
    createPermission.execute.mockResolvedValue(permission);

    const result = await controller.create(dto);

    expect(createPermission.execute).toHaveBeenCalledWith(dto);
    expect(result).toBe(permission);
  });

  it("update() delegates to UpdatePermissionService", async () => {
    const dto: UpdatePermissionDto = { name: "Read document v2" };
    updatePermission.execute.mockResolvedValue(permission);

    const result = await controller.update("permission-1", dto);

    expect(updatePermission.execute).toHaveBeenCalledWith("permission-1", dto);
    expect(result).toBe(permission);
  });

  it("delete() delegates to DeletePermissionService", async () => {
    deletePermission.execute.mockResolvedValue(undefined);

    await controller.delete("permission-1");

    expect(deletePermission.execute).toHaveBeenCalledWith("permission-1");
  });
});
