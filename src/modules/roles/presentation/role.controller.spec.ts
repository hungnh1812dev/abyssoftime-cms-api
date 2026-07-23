import { CreateRoleDto } from "../application/dto/create-role.dto";
import { UpdateRoleDto } from "../application/dto/update-role.dto";
import { CreateRoleService } from "../application/services/create-role.service";
import { DeleteRoleService } from "../application/services/delete-role.service";
import { ListRolesService } from "../application/services/list-roles.service";
import { UpdateRoleService } from "../application/services/update-role.service";
import { RoleEntity } from "../domain/entities/role.entiry";

import { Test } from "@nestjs/testing";

import { JwtTokenService } from "@/common/token/jwt-token.service";

import { RolesColtroller } from "./role.controller";

describe("RolesColtroller", () => {
  let controller: RolesColtroller;
  let listRolesService: jest.Mocked<ListRolesService>;
  let createRoleService: jest.Mocked<CreateRoleService>;
  let updateRoleService: jest.Mocked<UpdateRoleService>;
  let deleteRoleService: jest.Mocked<DeleteRoleService>;

  const role = new RoleEntity("role-1", "Editor", "editor", [], 10, false, new Date(), new Date(), "");

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      controllers: [RolesColtroller],
      providers: [
        { provide: ListRolesService, useValue: { execute: jest.fn() } },
        { provide: CreateRoleService, useValue: { execute: jest.fn() } },
        { provide: UpdateRoleService, useValue: { execute: jest.fn() } },
        { provide: DeleteRoleService, useValue: { execute: jest.fn() } },
        { provide: JwtTokenService, useValue: { verifyAccessToken: jest.fn() } },
      ],
    }).compile();

    controller = module.get(RolesColtroller);
    listRolesService = module.get(ListRolesService);
    createRoleService = module.get(CreateRoleService);
    updateRoleService = module.get(UpdateRoleService);
    deleteRoleService = module.get(DeleteRoleService);
  });

  it("list() delegates to ListRolesService", async () => {
    listRolesService.execute.mockResolvedValue([role]);

    const result = await controller.list();

    expect(listRolesService.execute).toHaveBeenCalled();
    expect(result).toEqual([role]);
  });

  it("create() delegates to CreateRoleService", async () => {
    const dto: CreateRoleDto = { name: "Editor", slug: "editor", permissions: [], level: 10 };
    createRoleService.execute.mockResolvedValue(role);

    const result = await controller.create(dto);

    expect(createRoleService.execute).toHaveBeenCalledWith(dto);
    expect(result).toBe(role);
  });

  it("update() delegates to UpdateRoleService", async () => {
    const dto: UpdateRoleDto = { name: "Editor v2" };
    updateRoleService.execute.mockResolvedValue(role);

    const result = await controller.update("role-1", dto);

    expect(updateRoleService.execute).toHaveBeenCalledWith("role-1", dto);
    expect(result).toBe(role);
  });

  it("delete() delegates to DeleteRoleService", async () => {
    deleteRoleService.execute.mockResolvedValue(undefined);

    await controller.delete("role-1");

    expect(deleteRoleService.execute).toHaveBeenCalledWith("role-1");
  });
});
