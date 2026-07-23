import { CreateRoleService } from "../application/services/create-role.service";
import { DeleteRoleService } from "../application/services/delete-role.service";
import { ListRolesService } from "../application/services/list-roles.service";
import { UpdateRoleService } from "../application/services/update-role.service";
import { RoleEntity } from "../domain/entities/role.entiry";

import { Test } from "@nestjs/testing";

import { RolesColtroller } from "./role.controller";

describe("RolesColtroller", () => {
  let controller: RolesColtroller;
  let listRolesService: jest.Mocked<ListRolesService>;

  const role = new RoleEntity("role-1", "Editor", "editor", [], 10, false, new Date(), new Date(), "");

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      controllers: [RolesColtroller],
      providers: [
        { provide: ListRolesService, useValue: { execute: jest.fn() } },
        { provide: CreateRoleService, useValue: { execute: jest.fn() } },
        { provide: UpdateRoleService, useValue: { execute: jest.fn() } },
        { provide: DeleteRoleService, useValue: { execute: jest.fn() } },
      ],
    }).compile();

    controller = module.get(RolesColtroller);
    listRolesService = module.get(ListRolesService);
  });

  it("list() delegates to ListRolesService", async () => {
    listRolesService.execute.mockResolvedValue([role]);

    const result = await controller.list();

    expect(listRolesService.execute).toHaveBeenCalled();
    expect(result).toEqual([role]);
  });
});
