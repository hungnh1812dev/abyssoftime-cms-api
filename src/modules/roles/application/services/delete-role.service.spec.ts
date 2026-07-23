import { RoleEntity } from "../../domain/entities/role.entiry";
import { IRoleRepository, ROLE_REPOSITORY, RoleNotFoundError } from "../../domain/repositories/role.repository";
import { IUserRoleCountRepository, USER_ROLE_COUNT_REPOSITORY } from "../../domain/repositories/user-role-count.repository";

import { BadRequestException, ConflictException, ForbiddenException, NotFoundException } from "@nestjs/common";
import { Test } from "@nestjs/testing";

import { DeleteRoleService } from "./delete-role.service";

describe("DeleteRoleService", () => {
  let service: DeleteRoleService;
  let roles: jest.Mocked<IRoleRepository>;
  let userRoleCounts: jest.Mocked<IUserRoleCountRepository>;

  const callerRole = new RoleEntity("role-caller", "Admin", "admin", [], 100, false, new Date(), new Date(), "");
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

  it("throws ForbiddenException when the caller's role cannot be resolved", async () => {
    roles.findBySlug.mockResolvedValue(undefined as unknown as RoleEntity);

    await expect(service.execute("role-1", "unknown-role")).rejects.toThrow(ForbiddenException);
    expect(roles.delete).not.toHaveBeenCalled();
  });

  it("throws NotFoundException when the target role does not exist", async () => {
    roles.findBySlug.mockResolvedValue(callerRole);
    roles.findById.mockResolvedValue(undefined as unknown as RoleEntity);

    await expect(service.execute("missing", "admin")).rejects.toThrow(NotFoundException);
    expect(roles.delete).not.toHaveBeenCalled();
  });

  it("throws ForbiddenException when the target role is at or above the caller's level", async () => {
    roles.findBySlug.mockResolvedValue(callerRole);
    roles.findById.mockResolvedValue(new RoleEntity("role-3", "Peer Admin", "peer-admin", [], 100, false, new Date(), new Date(), ""));

    await expect(service.execute("role-3", "admin")).rejects.toThrow(ForbiddenException);
    expect(roles.delete).not.toHaveBeenCalled();
  });

  it("throws BadRequestException when deleting a default role", async () => {
    roles.findBySlug.mockResolvedValue(callerRole);
    roles.findById.mockResolvedValue(defaultRole);

    await expect(service.execute("role-2", "admin")).rejects.toThrow(BadRequestException);
    expect(roles.delete).not.toHaveBeenCalled();
  });

  it("throws ConflictException when the role is still assigned to users", async () => {
    roles.findBySlug.mockResolvedValue(callerRole);
    roles.findById.mockResolvedValue(existing);
    userRoleCounts.countByRoleId.mockResolvedValue(3);

    await expect(service.execute("role-1", "admin")).rejects.toThrow(ConflictException);
    expect(roles.delete).not.toHaveBeenCalled();
  });

  it("translates RoleNotFoundError into NotFoundException", async () => {
    roles.findBySlug.mockResolvedValue(callerRole);
    roles.findById.mockResolvedValue(existing);
    userRoleCounts.countByRoleId.mockResolvedValue(0);
    roles.delete.mockRejectedValue(new RoleNotFoundError("role-1"));

    await expect(service.execute("role-1", "admin")).rejects.toThrow(NotFoundException);
  });

  it("rethrows unexpected errors from the repository", async () => {
    roles.findBySlug.mockResolvedValue(callerRole);
    roles.findById.mockResolvedValue(existing);
    userRoleCounts.countByRoleId.mockResolvedValue(0);
    const unexpected = new Error("db down");
    roles.delete.mockRejectedValue(unexpected);

    await expect(service.execute("role-1", "admin")).rejects.toThrow(unexpected);
  });

  it("deletes the role via the repository (happy path)", async () => {
    roles.findBySlug.mockResolvedValue(callerRole);
    roles.findById.mockResolvedValue(existing);
    userRoleCounts.countByRoleId.mockResolvedValue(0);
    roles.delete.mockResolvedValue(undefined);

    await service.execute("role-1", "admin");

    expect(roles.delete).toHaveBeenCalledWith("role-1");
  });
});
