import { RoleEntity } from "../../domain/entities/role.entiry";
import { IRoleRepository, ROLE_REPOSITORY, RoleAlreadyExistsError } from "../../domain/repositories/role.repository";
import { CreateRoleDto } from "../dto/create-role.dto";

import { BadRequestException, ConflictException } from "@nestjs/common";
import { Test } from "@nestjs/testing";

import { PermissionEntity } from "@/modules/permissions/domain/entities/permission.entity";
import { IPermissionRepository, PERMISSSION_REPOSITORY } from "@/modules/permissions/domain/repositories/permission.repository";

import { CreateRoleService } from "./create-role.service";

describe("CreateRoleService", () => {
  let service: CreateRoleService;
  let roles: jest.Mocked<IRoleRepository>;
  let permissions: jest.Mocked<IPermissionRepository>;

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

  it("skips the permission catalog check when permissions is empty", async () => {
    roles.create.mockResolvedValue(created);

    await service.execute(dto);

    expect(permissions.findAll).not.toHaveBeenCalled();
    expect(roles.create).toHaveBeenCalled();
  });

  it("throws BadRequestException when permissions include an unknown slug", async () => {
    permissions.findAll.mockResolvedValue(catalog);

    await expect(service.execute({ ...dto, permissions: ["document:delete"] })).rejects.toThrow(BadRequestException);
    expect(roles.create).not.toHaveBeenCalled();
  });

  it("creates the role when all permission slugs are valid", async () => {
    permissions.findAll.mockResolvedValue(catalog);
    roles.create.mockResolvedValue(created);

    const result = await service.execute({ ...dto, permissions: ["document:read"] });

    expect(roles.create).toHaveBeenCalledWith({ name: dto.name, slug: dto.slug, permissions: ["document:read"], level: dto.level, isDefault: false, updatedBy: "" });
    expect(result).toBe(created);
  });

  it("translates RoleAlreadyExistsError into ConflictException", async () => {
    roles.create.mockRejectedValue(new RoleAlreadyExistsError(dto.slug));

    await expect(service.execute(dto)).rejects.toThrow(ConflictException);
  });

  it("rethrows unexpected errors from the repository", async () => {
    const unexpected = new Error("db down");
    roles.create.mockRejectedValue(unexpected);

    await expect(service.execute(dto)).rejects.toThrow(unexpected);
  });

  it("creates a role via the repository (happy path)", async () => {
    roles.create.mockResolvedValue(created);

    const result = await service.execute(dto);

    expect(result).toBe(created);
  });
});
