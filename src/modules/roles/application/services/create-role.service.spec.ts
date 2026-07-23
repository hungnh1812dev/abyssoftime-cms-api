import { RoleEntity } from "../../domain/entities/role.entiry";
import { IRoleRepository, ROLE_REPOSITORY, RoleAlreadyExistsError } from "../../domain/repositories/role.repository";
import { CreateRoleDto } from "../dto/create-role.dto";

import { BadRequestException, ConflictException, ForbiddenException } from "@nestjs/common";
import { Test } from "@nestjs/testing";

import { PermissionEntity } from "@/modules/permissions/domain/entities/permission.entity";
import { IPermissionRepository, PERMISSSION_REPOSITORY } from "@/modules/permissions/domain/repositories/permission.repository";

import { CreateRoleService } from "./create-role.service";

describe("CreateRoleService", () => {
  let service: CreateRoleService;
  let roles: jest.Mocked<IRoleRepository>;
  let permissions: jest.Mocked<IPermissionRepository>;

  const callerRole = new RoleEntity("role-caller", "Admin", "admin", [], 100, false, new Date(), new Date(), "");
  const catalog = [new PermissionEntity("permission-1", "document:read", "Read document", "Allows reading a document", new Date(), new Date(), "")];
  const dto: CreateRoleDto = { name: "Editor", slug: "editor", permissions: [], level: 10 };
  const created = new RoleEntity("role-1", dto.name, dto.slug, dto.permissions, dto.level, false, new Date(), new Date(), "");

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
      providers: [CreateRoleService, { provide: ROLE_REPOSITORY, useValue: roles }, { provide: PERMISSSION_REPOSITORY, useValue: permissions }],
    }).compile();

    service = module.get(CreateRoleService);
  });

  it("throws ForbiddenException when the caller's role cannot be resolved", async () => {
    roles.findBySlug.mockResolvedValue(undefined as unknown as RoleEntity);

    await expect(service.execute(dto, "unknown-role")).rejects.toThrow(ForbiddenException);
    expect(roles.create).not.toHaveBeenCalled();
  });

  it("throws ForbiddenException when the requested level is not lower than the caller's", async () => {
    roles.findBySlug.mockResolvedValue(callerRole);

    await expect(service.execute({ ...dto, level: callerRole.level }, "admin")).rejects.toThrow(ForbiddenException);
    expect(roles.create).not.toHaveBeenCalled();
  });

  it("skips the permission catalog check when permissions is empty", async () => {
    roles.findBySlug.mockResolvedValue(callerRole);
    roles.create.mockResolvedValue(created);

    await service.execute(dto, "admin");

    expect(permissions.findAll).not.toHaveBeenCalled();
    expect(roles.create).toHaveBeenCalled();
  });

  it("throws BadRequestException when permissions include an unknown slug", async () => {
    roles.findBySlug.mockResolvedValue(callerRole);
    permissions.findAll.mockResolvedValue(catalog);

    await expect(service.execute({ ...dto, permissions: ["document:delete"] }, "admin")).rejects.toThrow(BadRequestException);
    expect(roles.create).not.toHaveBeenCalled();
  });

  it("creates the role when all permission slugs are valid", async () => {
    roles.findBySlug.mockResolvedValue(callerRole);
    permissions.findAll.mockResolvedValue(catalog);
    roles.create.mockResolvedValue(created);

    const result = await service.execute({ ...dto, permissions: ["document:read"] }, "admin");

    expect(roles.create).toHaveBeenCalledWith({ name: dto.name, slug: dto.slug, permissions: ["document:read"], level: dto.level, isDefault: false, updatedBy: "" });
    expect(result).toBe(created);
  });

  it("translates RoleAlreadyExistsError into ConflictException", async () => {
    roles.findBySlug.mockResolvedValue(callerRole);
    roles.create.mockRejectedValue(new RoleAlreadyExistsError(dto.slug));

    await expect(service.execute(dto, "admin")).rejects.toThrow(ConflictException);
  });

  it("rethrows unexpected errors from the repository", async () => {
    roles.findBySlug.mockResolvedValue(callerRole);
    const unexpected = new Error("db down");
    roles.create.mockRejectedValue(unexpected);

    await expect(service.execute(dto, "admin")).rejects.toThrow(unexpected);
  });

  it("creates a role via the repository (happy path)", async () => {
    roles.findBySlug.mockResolvedValue(callerRole);
    roles.create.mockResolvedValue(created);

    const result = await service.execute(dto, "admin");

    expect(roles.findBySlug).toHaveBeenCalledWith("admin");
    expect(result).toBe(created);
  });
});
