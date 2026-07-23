import { ConflictException, NotFoundException } from "@nestjs/common";
import { Test } from "@nestjs/testing";

import { UserEntity } from "../../domain/entities/user.entity";
import { IUserRepository, USER_REPOSITORY } from "../../domain/repositories/user.repository";
import { UpdateUserDto } from "../dto/update-user.dto";
import { UpdateUserService } from "./update-user.service";

describe("UpdateUserService", () => {
  let service: UpdateUserService;
  let repo: jest.Mocked<IUserRepository>;

  const existing = new UserEntity("user-1", "jane@example.com", "Jane Doe", "janedoe", "secret", true, false, "role-1", new Date(), new Date());
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
    };

    const module = await Test.createTestingModule({
      providers: [UpdateUserService, { provide: USER_REPOSITORY, useValue: repo }],
    }).compile();

    service = module.get(UpdateUserService);
  });

  it("throws NotFoundException when the user does not exist", async () => {
    repo.findById.mockResolvedValue(null);

    await expect(service.execute("missing", {})).rejects.toThrow(NotFoundException);
    expect(repo.update).not.toHaveBeenCalled();
  });

  it("updates the user via the repository", async () => {
    repo.findById.mockResolvedValue(existing);
    repo.update.mockResolvedValue(updated);

    const dto: UpdateUserDto = { name: "Jane Doe 2" };
    const result = await service.execute("user-1", dto);

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

    await service.execute("user-1", { email: existing.email });

    expect(repo.findByEmail).not.toHaveBeenCalled();
  });

  it("throws ConflictException when the new email is already taken", async () => {
    repo.findById.mockResolvedValue(existing);
    repo.findByEmail.mockResolvedValue(otherUser);

    await expect(service.execute("user-1", { email: "other@example.com" })).rejects.toThrow(ConflictException);
    expect(repo.update).not.toHaveBeenCalled();
  });

  it("allows the update when the new email is free", async () => {
    repo.findById.mockResolvedValue(existing);
    repo.findByEmail.mockResolvedValue(null);
    repo.update.mockResolvedValue(updated);

    await service.execute("user-1", { email: "jane2@example.com" });

    expect(repo.update).toHaveBeenCalled();
  });

  it("skips the username uniqueness check when the username is unchanged", async () => {
    repo.findById.mockResolvedValue(existing);
    repo.update.mockResolvedValue(updated);

    await service.execute("user-1", { username: existing.username });

    expect(repo.findByUsername).not.toHaveBeenCalled();
  });

  it("throws ConflictException when the new username is already taken", async () => {
    repo.findById.mockResolvedValue(existing);
    repo.findByUsername.mockResolvedValue(otherUser);

    await expect(service.execute("user-1", { username: "otheruser" })).rejects.toThrow(ConflictException);
    expect(repo.update).not.toHaveBeenCalled();
  });

  it("allows the update when the new username is free", async () => {
    repo.findById.mockResolvedValue(existing);
    repo.findByUsername.mockResolvedValue(null);
    repo.update.mockResolvedValue(updated);

    await service.execute("user-1", { username: "janedoe2" });

    expect(repo.update).toHaveBeenCalled();
  });
});
