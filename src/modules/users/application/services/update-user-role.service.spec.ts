import { UserEntity } from "../../domain/entities/user.entity";
import { IUserRepository, USER_REPOSITORY } from "../../domain/repositories/user.repository";
import { UpdateUserRoleDto } from "../dto/update-user-role.dto";

import { ForbiddenException, NotFoundException } from "@nestjs/common";
import { Test } from "@nestjs/testing";

import { type AccessTokenPayload } from "@/common/types/jwt-payload";
import { RoleEntity } from "@/modules/roles/domain/entities/role.entiry";
import { type IRoleRepository, ROLE_REPOSITORY } from "@/modules/roles/domain/repositories/role.repository";

import { UpdateUserRoleService } from "./update-user-role.service";

describe("UpdateUserRoleService", () => {
  let service: UpdateUserRoleService;
  let repo: jest.Mocked<IUserRepository>;
  let roles: jest.Mocked<IRoleRepository>;

  const lowRole = new RoleEntity("role-1", "Editor", "editor", [], 10, false, new Date(), new Date(), "");
  const peerRole = new RoleEntity("role-peer", "Peer Admin", "peer-admin", [], 50, false, new Date(), new Date(), "");
  const superAdminRole = new RoleEntity("role-super", "Super Admin", "super_admin", [], 100, true, new Date(), new Date(), "");

  const callerAdmin: AccessTokenPayload = { sub: "caller-1", roleSlug: "admin", level: 50, permissions: ["user:role_manager"] };
  const callerSuperAdmin: AccessTokenPayload = { sub: "caller-2", roleSlug: "super_admin", level: 100, permissions: ["user:role_manager"] };

  const existing = new UserEntity("user-1", "jane@example.com", "Jane Doe", "janedoe", "secret", true, false, "role-1", new Date(), new Date());
  const unassigned = new UserEntity("user-3", "unverified@example.com", "Unverified", "unverified", "secret", true, false, null, new Date(), new Date());
  const updated = new UserEntity("user-1", "jane@example.com", "Jane Doe", "janedoe", "secret", true, false, "role-peer", new Date(), new Date());

  beforeEach(async () => {
    repo = {
      findAll: jest.fn(),
      findById: jest.fn(),
      findByEmail: jest.fn(),
      findByUsername: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
      hasAnyVerified: jest.fn(),
      completeVerification: jest.fn(),
      findByResetTokenHash: jest.fn(),
    };
    roles = {
      findAll: jest.fn(),
      findBySlug: jest.fn(),
      findById: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      hasAny: jest.fn(),
    };
    roles.findById.mockImplementation((documentId: string) => {
      if (documentId === lowRole.documentId) return Promise.resolve(lowRole);
      if (documentId === peerRole.documentId) return Promise.resolve(peerRole);
      if (documentId === superAdminRole.documentId) return Promise.resolve(superAdminRole);
      return Promise.resolve(null as unknown as RoleEntity);
    });

    const module = await Test.createTestingModule({
      providers: [UpdateUserRoleService, { provide: USER_REPOSITORY, useValue: repo }, { provide: ROLE_REPOSITORY, useValue: roles }],
    }).compile();

    service = module.get(UpdateUserRoleService);
  });

  it("throws NotFoundException when the user does not exist", async () => {
    repo.findById.mockResolvedValue(null);

    const dto: UpdateUserRoleDto = { roleId: lowRole.documentId };
    await expect(service.execute("missing", dto, callerAdmin)).rejects.toThrow(NotFoundException);
    expect(repo.update).not.toHaveBeenCalled();
  });

  it("throws NotFoundException when the target roleId does not resolve to an existing role", async () => {
    repo.findById.mockResolvedValue(existing);

    const dto: UpdateUserRoleDto = { roleId: "missing-role" };
    await expect(service.execute("user-1", dto, callerAdmin)).rejects.toThrow(NotFoundException);
    expect(repo.update).not.toHaveBeenCalled();
  });

  it("throws ForbiddenException when the caller's level is not strictly greater than the target's current role level", async () => {
    repo.findById.mockResolvedValue(existing);

    const dto: UpdateUserRoleDto = { roleId: lowRole.documentId };
    await expect(service.execute("user-1", dto, { ...callerAdmin, level: 10 })).rejects.toThrow(ForbiddenException);
    expect(repo.update).not.toHaveBeenCalled();
  });

  it("skips the current-role hierarchy check when the target has no role yet", async () => {
    repo.findById.mockResolvedValue(unassigned);
    repo.update.mockResolvedValue(updated);

    const dto: UpdateUserRoleDto = { roleId: lowRole.documentId };
    await service.execute("user-3", dto, callerAdmin);

    expect(repo.update).toHaveBeenCalledWith("user-3", { roleId: lowRole.documentId });
  });

  it("throws ForbiddenException when assigning a new role at or above the caller's level", async () => {
    repo.findById.mockResolvedValue(existing);

    const dto: UpdateUserRoleDto = { roleId: peerRole.documentId };
    await expect(service.execute("user-1", dto, callerAdmin)).rejects.toThrow(ForbiddenException);
    expect(repo.update).not.toHaveBeenCalled();
  });

  it("allows assigning a new role strictly below the caller's level", async () => {
    repo.findById.mockResolvedValue(existing);
    repo.update.mockResolvedValue(updated);

    const dto: UpdateUserRoleDto = { roleId: lowRole.documentId };
    const result = await service.execute("user-1", dto, callerAdmin);

    expect(repo.update).toHaveBeenCalledWith("user-1", { roleId: lowRole.documentId });
    expect(result).toBe(updated);
  });

  it("skips the new-role check when roleId is unchanged", async () => {
    repo.findById.mockResolvedValue(existing);
    repo.update.mockResolvedValue(updated);

    const dto: UpdateUserRoleDto = { roleId: existing.roleId! };
    await service.execute("user-1", dto, callerAdmin);

    expect(repo.update).toHaveBeenCalledWith("user-1", { roleId: existing.roleId });
  });

  it("throws ForbiddenException when promoting to super_admin and the caller is not super_admin", async () => {
    repo.findById.mockResolvedValue(existing);

    const dto: UpdateUserRoleDto = { roleId: superAdminRole.documentId };
    await expect(service.execute("user-1", dto, callerAdmin)).rejects.toThrow(ForbiddenException);
    expect(repo.update).not.toHaveBeenCalled();
  });

  it("allows promoting to super_admin when the caller is super_admin", async () => {
    repo.findById.mockResolvedValue(existing);
    repo.update.mockResolvedValue(updated);

    const dto: UpdateUserRoleDto = { roleId: superAdminRole.documentId };
    await service.execute("user-1", dto, callerSuperAdmin);

    expect(repo.update).toHaveBeenCalledWith("user-1", { roleId: superAdminRole.documentId });
  });
});
