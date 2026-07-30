import { RoleEntity } from "../../domain/entities/role.entiry";
import { IRoleRepository, ROLE_REPOSITORY, RoleNotFoundError } from "../../domain/repositories/role.repository";
import { UpdateRoleDto } from "../dto/update-role.dto";

import { BadRequestException, NotFoundException } from "@nestjs/common";
import { Test } from "@nestjs/testing";

import { PermissionEntity } from "@/modules/permissions/domain/entities/permission.entity";
import { IPermissionRepository, PERMISSSION_REPOSITORY } from "@/modules/permissions/domain/repositories/permission.repository";

import { UpdateRoleService } from "./update-role.service";

describe("UpdateRoleService", () => {
  let service: UpdateRoleService;
  let roles: jest.Mocked<IRoleRepository>;
  let permissions: jest.Mocked<IPermissionRepository>;

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

  it("throws NotFoundException when the target role does not exist", async () => {
    roles.findById.mockResolvedValue(undefined as unknown as RoleEntity);

    await expect(service.execute("missing", {})).rejects.toThrow(NotFoundException);
    expect(roles.update).not.toHaveBeenCalled();
  });

  it("throws BadRequestException when changing name/level on a default role", async () => {
    roles.findById.mockResolvedValue(defaultRole);

    await expect(service.execute("role-2", { name: "New name" })).rejects.toThrow(BadRequestException);
    expect(roles.update).not.toHaveBeenCalled();
  });

  it("allows a permissions-only change on a default role", async () => {
    roles.findById.mockResolvedValue(defaultRole);
    roles.update.mockResolvedValue(updated);

    await service.execute("role-2", { permissions: [] });

    expect(roles.update).toHaveBeenCalledWith("role-2", { name: undefined, permissions: [], level: undefined });
  });

  it("skips the permission catalog check when dto.permissions is undefined", async () => {
    roles.findById.mockResolvedValue(existing);
    roles.update.mockResolvedValue(updated);

    await service.execute("role-1", { name: "Editor v2" });

    expect(permissions.findAll).not.toHaveBeenCalled();
  });

  it("throws BadRequestException when dto.permissions include an unknown slug", async () => {
    roles.findById.mockResolvedValue(existing);
    permissions.findAll.mockResolvedValue(catalog);

    await expect(service.execute("role-1", { permissions: ["document:delete"] })).rejects.toThrow(BadRequestException);
    expect(roles.update).not.toHaveBeenCalled();
  });

  it("updates the role when all provided permission slugs are valid", async () => {
    roles.findById.mockResolvedValue(existing);
    permissions.findAll.mockResolvedValue(catalog);
    roles.update.mockResolvedValue(updated);

    const dto: UpdateRoleDto = { permissions: ["document:read"] };
    const result = await service.execute("role-1", dto);

    expect(roles.update).toHaveBeenCalledWith("role-1", { name: undefined, permissions: ["document:read"], level: undefined });
    expect(result).toBe(updated);
  });

  it("translates RoleNotFoundError into NotFoundException", async () => {
    roles.findById.mockResolvedValue(existing);
    roles.update.mockRejectedValue(new RoleNotFoundError("role-1"));

    await expect(service.execute("role-1", { name: "Editor v2" })).rejects.toThrow(NotFoundException);
  });

  it("rethrows unexpected errors from the repository", async () => {
    roles.findById.mockResolvedValue(existing);
    const unexpected = new Error("db down");
    roles.update.mockRejectedValue(unexpected);

    await expect(service.execute("role-1", { name: "Editor v2" })).rejects.toThrow(unexpected);
  });

  it("updates a role via the repository (happy path)", async () => {
    roles.findById.mockResolvedValue(existing);
    roles.update.mockResolvedValue(updated);

    const result = await service.execute("role-1", { name: "Editor v2" });

    expect(result).toBe(updated);
  });
});
