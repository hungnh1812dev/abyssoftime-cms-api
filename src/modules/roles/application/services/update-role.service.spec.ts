import { RoleEntity } from "../../domain/entities/role.entiry";
import { IRoleRepository, ROLE_REPOSITORY, RoleNotFoundError } from "../../domain/repositories/role.repository";
import { UpdateRoleDto } from "../dto/update-role.dto";

import { BadRequestException, ForbiddenException, NotFoundException } from "@nestjs/common";
import { Test } from "@nestjs/testing";

import { PermissionEntity } from "@/modules/permissions/domain/entities/permission.entity";
import { IPermissionRepository, PERMISSSION_REPOSITORY } from "@/modules/permissions/domain/repositories/permission.repository";

import { UpdateRoleService } from "./update-role.service";

describe("UpdateRoleService", () => {
  let service: UpdateRoleService;
  let roles: jest.Mocked<IRoleRepository>;
  let permissions: jest.Mocked<IPermissionRepository>;

  const callerRole = new RoleEntity("role-caller", "Admin", "admin", [], 100, false, new Date(), new Date(), "");
  const existing = new RoleEntity("role-1", "Editor", "editor", [], 10, false, new Date(), new Date(), "");
  const defaultRole = new RoleEntity("role-2", "Member", "member", [], 10, true, new Date(), new Date(), "");
  const catalog = [new PermissionEntity("permission-1", "document:read", "Read document", "Allows reading a document", new Date(), new Date(), "")];
  const updated = new RoleEntity("role-1", "Editor v2", "editor", [], 10, false, new Date(), new Date(), "");

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
    permissions = {
      findAll: jest.fn(),
      findBySlug: jest.fn(),
      findByIds: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      countReferences: jest.fn(),
    };

    const module = await Test.createTestingModule({
      providers: [UpdateRoleService, { provide: ROLE_REPOSITORY, useValue: roles }, { provide: PERMISSSION_REPOSITORY, useValue: permissions }],
    }).compile();

    service = module.get(UpdateRoleService);
  });

  it("throws ForbiddenException when the caller's role cannot be resolved", async () => {
    roles.findBySlug.mockResolvedValue(undefined as unknown as RoleEntity);

    await expect(service.execute("role-1", {}, "unknown-role")).rejects.toThrow(ForbiddenException);
    expect(roles.update).not.toHaveBeenCalled();
  });

  it("throws NotFoundException when the target role does not exist", async () => {
    roles.findBySlug.mockResolvedValue(callerRole);
    roles.findById.mockResolvedValue(undefined as unknown as RoleEntity);

    await expect(service.execute("missing", {}, "admin")).rejects.toThrow(NotFoundException);
    expect(roles.update).not.toHaveBeenCalled();
  });

  it("throws ForbiddenException when the target role is at or above the caller's level", async () => {
    roles.findBySlug.mockResolvedValue(callerRole);
    roles.findById.mockResolvedValue(new RoleEntity("role-3", "Peer Admin", "peer-admin", [], 100, false, new Date(), new Date(), ""));

    await expect(service.execute("role-3", {}, "admin")).rejects.toThrow(ForbiddenException);
    expect(roles.update).not.toHaveBeenCalled();
  });

  it("throws ForbiddenException when the requested level is not lower than the caller's", async () => {
    roles.findBySlug.mockResolvedValue(callerRole);
    roles.findById.mockResolvedValue(existing);

    await expect(service.execute("role-1", { level: callerRole.level }, "admin")).rejects.toThrow(ForbiddenException);
    expect(roles.update).not.toHaveBeenCalled();
  });

  it("throws BadRequestException when changing name/level on a default role", async () => {
    roles.findBySlug.mockResolvedValue(callerRole);
    roles.findById.mockResolvedValue(defaultRole);

    await expect(service.execute("role-2", { name: "New name" }, "admin")).rejects.toThrow(BadRequestException);
    expect(roles.update).not.toHaveBeenCalled();
  });

  it("allows a permissions-only change on a default role", async () => {
    roles.findBySlug.mockResolvedValue(callerRole);
    roles.findById.mockResolvedValue(defaultRole);
    roles.update.mockResolvedValue(updated);

    await service.execute("role-2", { permissions: [] }, "admin");

    expect(roles.update).toHaveBeenCalledWith("role-2", { name: undefined, permissions: [], level: undefined });
  });

  it("skips the permission catalog check when dto.permissions is undefined", async () => {
    roles.findBySlug.mockResolvedValue(callerRole);
    roles.findById.mockResolvedValue(existing);
    roles.update.mockResolvedValue(updated);

    await service.execute("role-1", { name: "Editor v2" }, "admin");

    expect(permissions.findAll).not.toHaveBeenCalled();
  });

  it("throws BadRequestException when dto.permissions include an unknown slug", async () => {
    roles.findBySlug.mockResolvedValue(callerRole);
    roles.findById.mockResolvedValue(existing);
    permissions.findAll.mockResolvedValue(catalog);

    await expect(service.execute("role-1", { permissions: ["document:delete"] }, "admin")).rejects.toThrow(BadRequestException);
    expect(roles.update).not.toHaveBeenCalled();
  });

  it("updates the role when all provided permission slugs are valid", async () => {
    roles.findBySlug.mockResolvedValue(callerRole);
    roles.findById.mockResolvedValue(existing);
    permissions.findAll.mockResolvedValue(catalog);
    roles.update.mockResolvedValue(updated);

    const dto: UpdateRoleDto = { permissions: ["document:read"] };
    const result = await service.execute("role-1", dto, "admin");

    expect(roles.update).toHaveBeenCalledWith("role-1", { name: undefined, permissions: ["document:read"], level: undefined });
    expect(result).toBe(updated);
  });

  it("translates RoleNotFoundError into NotFoundException", async () => {
    roles.findBySlug.mockResolvedValue(callerRole);
    roles.findById.mockResolvedValue(existing);
    roles.update.mockRejectedValue(new RoleNotFoundError("role-1"));

    await expect(service.execute("role-1", { name: "Editor v2" }, "admin")).rejects.toThrow(NotFoundException);
  });

  it("rethrows unexpected errors from the repository", async () => {
    roles.findBySlug.mockResolvedValue(callerRole);
    roles.findById.mockResolvedValue(existing);
    const unexpected = new Error("db down");
    roles.update.mockRejectedValue(unexpected);

    await expect(service.execute("role-1", { name: "Editor v2" }, "admin")).rejects.toThrow(unexpected);
  });

  it("updates a role via the repository (happy path)", async () => {
    roles.findBySlug.mockResolvedValue(callerRole);
    roles.findById.mockResolvedValue(existing);
    roles.update.mockResolvedValue(updated);

    const result = await service.execute("role-1", { name: "Editor v2" }, "admin");

    expect(result).toBe(updated);
  });
});
