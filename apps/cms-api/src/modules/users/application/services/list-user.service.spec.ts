import { UserEntity } from "../../domain/entities/user.entity";
import { IUserRepository, USER_REPOSITORY } from "../../domain/repositories/user.repository";

import { Test } from "@nestjs/testing";

import { ListUserService } from "./list-user.service";

describe("ListUserService", () => {
  let service: ListUserService;
  let repo: jest.Mocked<IUserRepository>;

  beforeEach(async () => {
    repo = {
      findAll: jest.fn(),
      findById: jest.fn(),
      findByEmail: jest.fn(),
      findByUsername: jest.fn(),
      findByIds: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
      hasAnyVerified: jest.fn(),
      completeVerification: jest.fn(),
      findByResetTokenHash: jest.fn(),
    };

    const module = await Test.createTestingModule({
      providers: [ListUserService, { provide: USER_REPOSITORY, useValue: repo }],
    }).compile();

    service = module.get(ListUserService);
  });

  it("returns all users from the repository", async () => {
    const users = [new UserEntity("user-1", "jane@example.com", "Jane Doe", "janedoe", "secret", true, false, "role-1", new Date(), new Date())];
    repo.findAll.mockResolvedValue(users);

    const result = await service.execute();

    expect(repo.findAll).toHaveBeenCalled();
    expect(result).toBe(users);
  });
});
