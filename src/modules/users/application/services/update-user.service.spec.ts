import { UserEntity } from "../../domain/entities/user.entity";
import { IUserRepository, USER_REPOSITORY } from "../../domain/repositories/user.repository";
import { UpdateUserDto } from "../dto/update-user.dto";

import { ConflictException, ForbiddenException, NotFoundException } from "@nestjs/common";
import { Test } from "@nestjs/testing";

import { type AccessTokenPayload } from "@/common/types/jwt-payload";
import { RoleEntity } from "@/modules/roles/domain/entities/role.entiry";
import { type IRoleRepository, ROLE_REPOSITORY } from "@/modules/roles/domain/repositories/role.repository";

import { UpdateUserService } from "./update-user.service";

describe("UpdateUserService", () => {
  let service: UpdateUserService;
  let repo: jest.Mocked<IUserRepository>;
  let roles: jest.Mocked<IRoleRepository>;

  const lowRole = new RoleEntity("role-1", "Editor", "editor", [], 10, false, new Date(), new Date(), "");
  const peerRole = new RoleEntity("role-peer", "Peer Admin", "peer-admin", [], 50, false, new Date(), new Date(), "");
  const superAdminRole = new RoleEntity("role-super", "Super Admin", "super_admin", [], 100, true, new Date(), new Date(), "");

  const callerAdmin: AccessTokenPayload = { sub: "caller-1", roleSlug: "admin", level: 50, permissions: ["user:manager"] };
  const callerSuperAdmin: AccessTokenPayload = { sub: "caller-2", roleSlug: "super_admin", level: 100, permissions: ["user:manager"] };

  const existing = new UserEntity("user-1", "jane@example.com", "Jane Doe", "janedoe", "secret", true, false, "role-1", new Date(), new Date());
  const unassigned = new UserEntity("user-3", "unverified@example.com", "Unverified", "unverified", "secret", true, false, null, new Date(), new Date());
  const updated = new UserEntity("user-1", "jane2@example.com", "Jane Doe 2", "janedoe2", "secret2", true, true, "role-1", new Date(), new Date());
  const otherUser = new UserEntity("user-2", "other@example.com", "Other", "otheruser", "pw", true, false, "role-1", new Date(), new Date());

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
      return Promise.reject(new Error(`unexpected role id "${documentId}"`));
    });

    const module = await Test.createTestingModule({
      providers: [UpdateUserService, { provide: USER_REPOSITORY, useValue: repo }, { provide: ROLE_REPOSITORY, useValue: roles }],
    }).compile();

    service = module.get(UpdateUserService);
  });

  it("throws NotFoundException when the user does not exist", async () => {
    repo.findById.mockResolvedValue(null);

    await expect(service.execute("missing", {}, callerAdmin)).rejects.toThrow(NotFoundException);
    expect(repo.update).not.toHaveBeenCalled();
  });

  it("updates the user via the repository", async () => {
    repo.findById.mockResolvedValue(existing);
    repo.update.mockResolvedValue(updated);

    const dto: UpdateUserDto = { name: "Jane Doe 2" };
    const result = await service.execute("user-1", dto, callerAdmin);

    expect(repo.update).toHaveBeenCalledWith("user-1", {
      email: undefined,
      name: "Jane Doe 2",
      username: undefined,
      password: undefined,
      accountType: undefined,
      verified: undefined,
      roleId: undefined,
    });
    expect(result).toBe(updated);
  });

  it("skips the email uniqueness check when the email is unchanged", async () => {
    repo.findById.mockResolvedValue(existing);
    repo.update.mockResolvedValue(updated);

    await service.execute("user-1", { email: existing.email }, callerAdmin);

    expect(repo.findByEmail).not.toHaveBeenCalled();
  });

  it("throws ConflictException when the new email is already taken", async () => {
    repo.findById.mockResolvedValue(existing);
    repo.findByEmail.mockResolvedValue(otherUser);

    await expect(service.execute("user-1", { email: "other@example.com" }, callerAdmin)).rejects.toThrow(ConflictException);
    expect(repo.update).not.toHaveBeenCalled();
  });

  it("allows the update when the new email is free", async () => {
    repo.findById.mockResolvedValue(existing);
    repo.findByEmail.mockResolvedValue(null);
    repo.update.mockResolvedValue(updated);

    await service.execute("user-1", { email: "jane2@example.com" }, callerAdmin);

    expect(repo.update).toHaveBeenCalled();
  });

  it("skips the username uniqueness check when the username is unchanged", async () => {
    repo.findById.mockResolvedValue(existing);
    repo.update.mockResolvedValue(updated);

    await service.execute("user-1", { username: existing.username }, callerAdmin);

    expect(repo.findByUsername).not.toHaveBeenCalled();
  });

  it("throws ConflictException when the new username is already taken", async () => {
    repo.findById.mockResolvedValue(existing);
    repo.findByUsername.mockResolvedValue(otherUser);

    await expect(service.execute("user-1", { username: "otheruser" }, callerAdmin)).rejects.toThrow(ConflictException);
    expect(repo.update).not.toHaveBeenCalled();
  });

  it("allows the update when the new username is free", async () => {
    repo.findById.mockResolvedValue(existing);
    repo.findByUsername.mockResolvedValue(null);
    repo.update.mockResolvedValue(updated);

    await service.execute("user-1", { username: "janedoe2" }, callerAdmin);

    expect(repo.update).toHaveBeenCalled();
  });

  it("throws ForbiddenException when the caller's level is not strictly greater than the target's current role level", async () => {
    repo.findById.mockResolvedValue(existing);

    await expect(service.execute("user-1", { name: "Jane Doe 2" }, { ...callerAdmin, level: 10 })).rejects.toThrow(ForbiddenException);
    expect(repo.update).not.toHaveBeenCalled();
  });

  it("skips the current-role hierarchy check when the target has no role yet", async () => {
    repo.findById.mockResolvedValue(unassigned);
    repo.update.mockResolvedValue(updated);

    await service.execute("user-3", { name: "New name" }, { ...callerAdmin, level: 0 });

    expect(roles.findById).not.toHaveBeenCalled();
    expect(repo.update).toHaveBeenCalled();
  });

  it("throws ForbiddenException when assigning a new role at or above the caller's level", async () => {
    repo.findById.mockResolvedValue(existing);

    await expect(service.execute("user-1", { roleId: peerRole.documentId }, callerAdmin)).rejects.toThrow(ForbiddenException);
    expect(repo.update).not.toHaveBeenCalled();
  });

  it("allows assigning a new role strictly below the caller's level", async () => {
    repo.findById.mockResolvedValue(existing);
    repo.update.mockResolvedValue(updated);

    await service.execute("user-1", { roleId: lowRole.documentId }, callerAdmin);

    expect(repo.update).toHaveBeenCalled();
  });

  it("skips the new-role check when roleId is unchanged", async () => {
    repo.findById.mockResolvedValue(existing);
    repo.update.mockResolvedValue(updated);

    await service.execute("user-1", { roleId: existing.roleId! }, callerAdmin);

    expect(roles.findById).toHaveBeenCalledTimes(1);
    expect(repo.update).toHaveBeenCalled();
  });

  it("throws ForbiddenException when promoting to super_admin and the caller is not super_admin", async () => {
    repo.findById.mockResolvedValue(existing);

    await expect(service.execute("user-1", { roleId: superAdminRole.documentId }, callerAdmin)).rejects.toThrow(ForbiddenException);
    expect(repo.update).not.toHaveBeenCalled();
  });

  it("allows promoting to super_admin when the caller is super_admin", async () => {
    repo.findById.mockResolvedValue(existing);
    repo.update.mockResolvedValue(updated);

    await service.execute("user-1", { roleId: superAdminRole.documentId }, callerSuperAdmin);

    expect(repo.update).toHaveBeenCalled();
  });

  it("rethrows unexpected repository errors", async () => {
    repo.findById.mockResolvedValue(existing);
    const unexpected = new Error("db down");
    repo.update.mockRejectedValue(unexpected);

    await expect(service.execute("user-1", { name: "Jane Doe 2" }, callerAdmin)).rejects.toThrow(unexpected);
  });
});
