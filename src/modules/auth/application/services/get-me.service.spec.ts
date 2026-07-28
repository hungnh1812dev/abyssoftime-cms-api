import { NotFoundException, UnauthorizedException } from "@nestjs/common";
import { Test } from "@nestjs/testing";

import { RoleEntity } from "@/modules/roles/domain/entities/role.entiry";
import { type IRoleRepository, ROLE_REPOSITORY } from "@/modules/roles/domain/repositories/role.repository";
import { UserEntity } from "@/modules/users/domain/entities/user.entity";
import { type IUserRepository, USER_REPOSITORY } from "@/modules/users/domain/repositories/user.repository";

import { GetMeService } from "./get-me.service";

describe("GetMeService", () => {
  let service: GetMeService;
  let users: jest.Mocked<IUserRepository>;
  let roles: jest.Mocked<IRoleRepository>;

  const withRole = new UserEntity("user-1", "jane@example.com", "Jane Doe", "janedoe", "secret", true, true, "role-1", new Date(), new Date());
  const withoutRole = new UserEntity("user-2", "unverified@example.com", "New User", "newuser", "secret", true, false, null, new Date(), new Date());
  const role = new RoleEntity("role-1", "Editor", "editor", ["document:read"], 20, false, new Date(), new Date(), null);

  beforeEach(async () => {
    users = {
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

    const module = await Test.createTestingModule({
      providers: [GetMeService, { provide: USER_REPOSITORY, useValue: users }, { provide: ROLE_REPOSITORY, useValue: roles }],
    }).compile();

    service = module.get(GetMeService);
  });

  it("returns the user and their resolved role", async () => {
    users.findById.mockResolvedValue(withRole);
    roles.findById.mockResolvedValue(role);

    const result = await service.execute("user-1");

    expect(users.findById).toHaveBeenCalledWith("user-1");
    expect(roles.findById).toHaveBeenCalledWith("role-1");
    expect(result).toEqual({ user: withRole, role });
  });

  it("returns role: null when the user has no roleId, without looking up a role", async () => {
    users.findById.mockResolvedValue(withoutRole);

    const result = await service.execute("user-2");

    expect(roles.findById).not.toHaveBeenCalled();
    expect(result).toEqual({ user: withoutRole, role: null });
  });

  it("throws UnauthorizedException when the user no longer exists", async () => {
    users.findById.mockResolvedValue(null);

    await expect(service.execute("missing")).rejects.toThrow(UnauthorizedException);
    expect(roles.findById).not.toHaveBeenCalled();
  });

  it("throws NotFoundException when the user's roleId does not resolve to an existing role", async () => {
    users.findById.mockResolvedValue(withRole);
    roles.findById.mockResolvedValue(null as unknown as RoleEntity);

    await expect(service.execute("user-1")).rejects.toThrow(NotFoundException);
  });
});
