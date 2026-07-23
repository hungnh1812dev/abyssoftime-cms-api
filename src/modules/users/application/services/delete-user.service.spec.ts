import { UserEntity } from "../../domain/entities/user.entity";
import { IUserRepository, USER_REPOSITORY } from "../../domain/repositories/user.repository";

import { NotFoundException } from "@nestjs/common";
import { Test } from "@nestjs/testing";

import { DeleteUserService } from "./delete-user.service";

describe("DeleteUserService", () => {
  let service: DeleteUserService;
  let repo: jest.Mocked<IUserRepository>;

  const existing = new UserEntity("user-1", "jane@example.com", "Jane Doe", "janedoe", "secret", true, false, "role-1", new Date(), new Date());

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

    const module = await Test.createTestingModule({
      providers: [DeleteUserService, { provide: USER_REPOSITORY, useValue: repo }],
    }).compile();

    service = module.get(DeleteUserService);
  });

  it("throws NotFoundException when the user does not exist", async () => {
    repo.findById.mockResolvedValue(null);

    await expect(service.execute("missing")).rejects.toThrow(NotFoundException);
    expect(repo.delete).not.toHaveBeenCalled();
  });

  it("deletes the user via the repository", async () => {
    repo.findById.mockResolvedValue(existing);
    repo.delete.mockResolvedValue(undefined);

    await service.execute("user-1");

    expect(repo.delete).toHaveBeenCalledWith("user-1");
  });
});
