import { Test } from "@nestjs/testing";

import { RoleEntity } from "../../domain/entities/role.entiry";
import { IRoleRepository, ROLE_REPOSITORY } from "../../domain/repositories/role.repository";
import { ListRolesService } from "./list-roles.service";

describe("ListRolesService", () => {
  let service: ListRolesService;
  let roles: jest.Mocked<IRoleRepository>;

  beforeEach(async () => {
    roles = {
      findAll: jest.fn(),
      findBySlug: jest.fn(),
      findById: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      hasAny: jest.fn(),
    };

    const module = await Test.createTestingModule({
      providers: [ListRolesService, { provide: ROLE_REPOSITORY, useValue: roles }],
    }).compile();

    service = module.get(ListRolesService);
  });

  it("returns all roles from the repository", async () => {
    const roleList = [new RoleEntity("role-1", "Editor", "editor", [], 10, false, new Date(), new Date(), "")];
    roles.findAll.mockResolvedValue(roleList);

    const result = await service.execute();

    expect(roles.findAll).toHaveBeenCalled();
    expect(result).toBe(roleList);
  });
});
