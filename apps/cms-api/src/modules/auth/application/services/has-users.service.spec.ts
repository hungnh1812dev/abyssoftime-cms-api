import { Test } from "@nestjs/testing";

import { type IUserRepository, USER_REPOSITORY } from "@/modules/users/domain/repositories/user.repository";

import { HasUsersService } from "./has-users.service";

describe("HasUsersService", () => {
  let service: HasUsersService;
  let users: jest.Mocked<IUserRepository>;

  beforeEach(async () => {
    users = {
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
      providers: [HasUsersService, { provide: USER_REPOSITORY, useValue: users }],
    }).compile();

    service = module.get(HasUsersService);
  });

  it("returns false when no user exists yet", async () => {
    users.count.mockResolvedValue(0);

    await expect(service.execute()).resolves.toBe(false);
  });

  it("returns true when at least one user exists", async () => {
    users.count.mockResolvedValue(1);

    await expect(service.execute()).resolves.toBe(true);
  });
});
