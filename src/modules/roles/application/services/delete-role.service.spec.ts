import { RoleEntity } from "../../domain/entities/role.entiry";
import { IRoleRepository, ROLE_REPOSITORY, RoleNotFoundError } from "../../domain/repositories/role.repository";
import { IUserRoleCountRepository, USER_ROLE_COUNT_REPOSITORY } from "../../domain/repositories/user-role-count.repository";

import { BadRequestException, ConflictException, NotFoundException } from "@nestjs/common";
import { Test } from "@nestjs/testing";

import { DeleteRoleService } from "./delete-role.service";

describe("DeleteRoleService", () => {
  let service: DeleteRoleService;
  let roles: jest.Mocked<IRoleRepository>;
  let userRoleCounts: jest.Mocked<IUserRoleCountRepository>;

  const existing = new RoleEntity("role-1", "Editor", "editor", [], 10, false, new Date(), new Date(), "");
  const defaultRole = new RoleEntity("role-2", "Member", "member", [], 10, true, new Date(), new Date(), "");

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
    userRoleCounts = {
      countByRoleId: jest.fn(),
    };

    const module = await Test.createTestingModule({
      providers: [DeleteRoleService, { provide: ROLE_REPOSITORY, useValue: roles }, { provide: USER_ROLE_COUNT_REPOSITORY, useValue: userRoleCounts }],
    }).compile();

    service = module.get(DeleteRoleService);
  });

  it("throws NotFoundException when the target role does not exist", async () => {
    roles.findById.mockResolvedValue(undefined as unknown as RoleEntity);

    await expect(service.execute("missing")).rejects.toThrow(NotFoundException);
    expect(roles.delete).not.toHaveBeenCalled();
  });

  it("throws BadRequestException when deleting a default role", async () => {
    roles.findById.mockResolvedValue(defaultRole);

    await expect(service.execute("role-2")).rejects.toThrow(BadRequestException);
    expect(roles.delete).not.toHaveBeenCalled();
  });

  it("throws ConflictException when the role is still assigned to users", async () => {
    roles.findById.mockResolvedValue(existing);
    userRoleCounts.countByRoleId.mockResolvedValue(3);

    await expect(service.execute("role-1")).rejects.toThrow(ConflictException);
    expect(roles.delete).not.toHaveBeenCalled();
  });

  it("translates RoleNotFoundError into NotFoundException", async () => {
    roles.findById.mockResolvedValue(existing);
    userRoleCounts.countByRoleId.mockResolvedValue(0);
    roles.delete.mockRejectedValue(new RoleNotFoundError("role-1"));

    await expect(service.execute("role-1")).rejects.toThrow(NotFoundException);
  });

  it("rethrows unexpected errors from the repository", async () => {
    roles.findById.mockResolvedValue(existing);
    userRoleCounts.countByRoleId.mockResolvedValue(0);
    const unexpected = new Error("db down");
    roles.delete.mockRejectedValue(unexpected);

    await expect(service.execute("role-1")).rejects.toThrow(unexpected);
  });

  it("deletes the role via the repository (happy path)", async () => {
    roles.findById.mockResolvedValue(existing);
    userRoleCounts.countByRoleId.mockResolvedValue(0);
    roles.delete.mockResolvedValue(undefined);

    await service.execute("role-1");

    expect(roles.delete).toHaveBeenCalledWith("role-1");
  });
});
