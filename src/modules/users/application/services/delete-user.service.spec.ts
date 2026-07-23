import { UserEntity } from "../../domain/entities/user.entity";
import { IUserRepository, USER_REPOSITORY } from "../../domain/repositories/user.repository";

import { ForbiddenException, NotFoundException } from "@nestjs/common";
import { Test } from "@nestjs/testing";

import { type AccessTokenPayload } from "@/common/types/jwt-payload";
import { RoleEntity } from "@/modules/roles/domain/entities/role.entiry";
import { type IRoleRepository, ROLE_REPOSITORY } from "@/modules/roles/domain/repositories/role.repository";

import { DeleteUserService } from "./delete-user.service";

describe("DeleteUserService", () => {
  let service: DeleteUserService;
  let repo: jest.Mocked<IUserRepository>;
  let roles: jest.Mocked<IRoleRepository>;

  const lowRole = new RoleEntity("role-1", "Editor", "editor", [], 10, false, new Date(), new Date(), "");
  const callerAdmin: AccessTokenPayload = { sub: "caller-1", roleSlug: "admin", level: 50, permissions: ["user:manager"] };

  const existing = new UserEntity("user-1", "jane@example.com", "Jane Doe", "janedoe", "secret", true, false, "role-1", new Date(), new Date());
  const unassigned = new UserEntity("user-3", "unverified@example.com", "Unverified", "unverified", "secret", true, false, null, new Date(), new Date());

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
    roles.findById.mockResolvedValue(lowRole);

    const module = await Test.createTestingModule({
      providers: [DeleteUserService, { provide: USER_REPOSITORY, useValue: repo }, { provide: ROLE_REPOSITORY, useValue: roles }],
    }).compile();

    service = module.get(DeleteUserService);
  });

  it("throws NotFoundException when the user does not exist", async () => {
    repo.findById.mockResolvedValue(null);

    await expect(service.execute("missing", callerAdmin)).rejects.toThrow(NotFoundException);
    expect(repo.delete).not.toHaveBeenCalled();
  });

  it("deletes the user via the repository", async () => {
    repo.findById.mockResolvedValue(existing);
    repo.delete.mockResolvedValue(undefined);

    await service.execute("user-1", callerAdmin);

    expect(repo.delete).toHaveBeenCalledWith("user-1");
  });

  it("throws ForbiddenException when the caller's level is not strictly greater than the target's role level", async () => {
    repo.findById.mockResolvedValue(existing);

    await expect(service.execute("user-1", { ...callerAdmin, level: 10 })).rejects.toThrow(ForbiddenException);
    expect(repo.delete).not.toHaveBeenCalled();
  });

  it("skips the hierarchy check when the target has no role yet", async () => {
    repo.findById.mockResolvedValue(unassigned);
    repo.delete.mockResolvedValue(undefined);

    await service.execute("user-3", { ...callerAdmin, level: 0 });

    expect(roles.findById).not.toHaveBeenCalled();
    expect(repo.delete).toHaveBeenCalledWith("user-3");
  });
});
