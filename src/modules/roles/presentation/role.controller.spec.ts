import { CreateRoleDto } from "../application/dto/create-role.dto";
import { UpdateRoleDto } from "../application/dto/update-role.dto";
import { CreateRoleService } from "../application/services/create-role.service";
import { DeleteRoleService } from "../application/services/delete-role.service";
import { ListRolesService } from "../application/services/list-roles.service";
import { UpdateRoleService } from "../application/services/update-role.service";
import { RoleEntity } from "../domain/entities/role.entiry";

import { Test } from "@nestjs/testing";

import { AuthenticatedRequest, RolesColtroller } from "./role.controller";

describe("RolesColtroller", () => {
  let controller: RolesColtroller;
  let listRolesService: jest.Mocked<ListRolesService>;
  let createRoleService: jest.Mocked<CreateRoleService>;
  let updateRoleService: jest.Mocked<UpdateRoleService>;
  let deleteRoleService: jest.Mocked<DeleteRoleService>;

  const role = new RoleEntity("role-1", "Editor", "editor", [], 10, false, new Date(), new Date(), "");

  const requestWithCaller = (roleSlug?: string): AuthenticatedRequest => ({ user: roleSlug ? { roleSlug } : undefined }) as AuthenticatedRequest;

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

  it("create() delegates to CreateRoleService with the caller role slug from req.user", async () => {
    const dto: CreateRoleDto = { name: "Editor", slug: "editor", permissions: [], level: 10 };
    createRoleService.execute.mockResolvedValue(role);

    const result = await controller.create(dto, requestWithCaller("admin"));

    expect(createRoleService.execute).toHaveBeenCalledWith(dto, "admin");
    expect(result).toBe(role);
  });

  it("create() passes an empty caller role slug when req.user is not set", async () => {
    const dto: CreateRoleDto = { name: "Editor", slug: "editor", permissions: [], level: 10 };
    createRoleService.execute.mockResolvedValue(role);

    await controller.create(dto, requestWithCaller());

    expect(createRoleService.execute).toHaveBeenCalledWith(dto, "");
  });

  it("update() delegates to UpdateRoleService with the caller role slug from req.user", async () => {
    const dto: UpdateRoleDto = { name: "Editor v2" };
    updateRoleService.execute.mockResolvedValue(role);

    const result = await controller.update("role-1", dto, requestWithCaller("admin"));

    expect(updateRoleService.execute).toHaveBeenCalledWith("role-1", dto, "admin");
    expect(result).toBe(role);
  });

  it("delete() delegates to DeleteRoleService with the caller role slug from req.user", async () => {
    deleteRoleService.execute.mockResolvedValue(undefined);

    await controller.delete("role-1", requestWithCaller("admin"));

    expect(deleteRoleService.execute).toHaveBeenCalledWith("role-1", "admin");
  });
});
