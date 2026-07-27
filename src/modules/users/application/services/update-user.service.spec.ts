import { UserEntity } from "../../domain/entities/user.entity";
import { IUserRepository, USER_REPOSITORY } from "../../domain/repositories/user.repository";
import { UpdateUserDto } from "../dto/update-user.dto";

import { ForbiddenException, NotFoundException } from "@nestjs/common";
import { Test } from "@nestjs/testing";

import { type AccessTokenPayload } from "@/common/types/jwt-payload";

import { UpdateUserService } from "./update-user.service";

describe("UpdateUserService", () => {
  let service: UpdateUserService;
  let repo: jest.Mocked<IUserRepository>;

  const callerSelf: AccessTokenPayload = { sub: "user-1", roleSlug: "guest", level: 0, permissions: [] };
  const callerManager: AccessTokenPayload = { sub: "caller-1", roleSlug: "admin", level: 50, permissions: ["user:manager"] };
  const callerNoPermission: AccessTokenPayload = { sub: "caller-2", roleSlug: "guest", level: 0, permissions: [] };

  const existing = new UserEntity("user-1", "jane@example.com", "Jane Doe", "janedoe", "secret", true, false, "role-1", new Date(), new Date());
  const updated = new UserEntity("user-1", "jane@example.com", "Jane Doe 2", "janedoe", "secret2", true, false, "role-1", new Date(), new Date());

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

    const module = await Test.createTestingModule({
      providers: [UpdateUserService, { provide: USER_REPOSITORY, useValue: repo }],
    }).compile();

    service = module.get(UpdateUserService);
  });

  it("throws NotFoundException when the user does not exist", async () => {
    repo.findById.mockResolvedValue(null);

    await expect(service.execute("missing", {}, callerManager)).rejects.toThrow(NotFoundException);
    expect(repo.update).not.toHaveBeenCalled();
  });

  it("updates the user via the repository, passing only name and password", async () => {
    repo.findById.mockResolvedValue(existing);
    repo.update.mockResolvedValue(updated);

    const dto: UpdateUserDto = { name: "Jane Doe 2" };
    const result = await service.execute("user-1", dto, callerManager);

    expect(repo.update).toHaveBeenCalledWith("user-1", { name: "Jane Doe 2", password: undefined });
    expect(result).toBe(updated);
  });

  it("allows a caller to update their own record without holding user:manager", async () => {
    repo.findById.mockResolvedValue(existing);
    repo.update.mockResolvedValue(updated);

    await service.execute("user-1", { name: "Jane Doe 2" }, callerSelf);

    expect(repo.update).toHaveBeenCalledWith("user-1", { name: "Jane Doe 2", password: undefined });
  });

  it("allows a caller holding user:manager to update another user's record", async () => {
    repo.findById.mockResolvedValue(existing);
    repo.update.mockResolvedValue(updated);

    await service.execute("user-1", { name: "Jane Doe 2" }, callerManager);

    expect(repo.update).toHaveBeenCalled();
  });

  it("throws ForbiddenException when a caller without user:manager tries to update another user's record", async () => {
    repo.findById.mockResolvedValue(existing);

    await expect(service.execute("user-1", { name: "Jane Doe 2" }, callerNoPermission)).rejects.toThrow(ForbiddenException);
    expect(repo.update).not.toHaveBeenCalled();
  });

  it("rethrows unexpected repository errors", async () => {
    repo.findById.mockResolvedValue(existing);
    const unexpected = new Error("db down");
    repo.update.mockRejectedValue(unexpected);

    await expect(service.execute("user-1", { name: "Jane Doe 2" }, callerManager)).rejects.toThrow(unexpected);
  });
});
