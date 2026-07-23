import { ConflictException } from "@nestjs/common";
import { Test } from "@nestjs/testing";

import { UserEntity } from "../../domain/entities/user.entity";
import { IUserRepository, USER_REPOSITORY } from "../../domain/repositories/user.repository";
import { CreateUserDto } from "../dto/create-user.dto";
import { CreateUserService } from "./create-user.service";

describe("CreateUserService", () => {
  let service: CreateUserService;
  let repo: jest.Mocked<IUserRepository>;

  const dto: CreateUserDto = {
    email: "jane@example.com",
    name: "Jane Doe",
    username: "janedoe",
    password: "secret",
    accountType: true,
    roleId: "role-1",
  };

  const createdUser = new UserEntity("user-1", dto.email, dto.name, dto.username, dto.password, dto.accountType, false, dto.roleId, new Date(), new Date());

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
      providers: [CreateUserService, { provide: USER_REPOSITORY, useValue: repo }],
    }).compile();

    service = module.get(CreateUserService);
  });

  it("creates a user via the repository", async () => {
    repo.findByEmail.mockResolvedValue(null);
    repo.findByUsername.mockResolvedValue(null);
    repo.create.mockResolvedValue(createdUser);

    const result = await service.execute(dto);

    expect(repo.create).toHaveBeenCalledWith({
      email: dto.email,
      name: dto.name,
      username: dto.username,
      password: dto.password,
      accountType: dto.accountType,
      verified: false,
      roleId: dto.roleId,
    });
    expect(result).toBe(createdUser);
  });

  it("defaults verified to false when omitted", async () => {
    repo.findByEmail.mockResolvedValue(null);
    repo.findByUsername.mockResolvedValue(null);
    repo.create.mockResolvedValue(createdUser);

    await service.execute(dto);

    expect(repo.create).toHaveBeenCalledWith(expect.objectContaining({ verified: false }));
  });

  it("passes verified through when provided", async () => {
    repo.findByEmail.mockResolvedValue(null);
    repo.findByUsername.mockResolvedValue(null);
    repo.create.mockResolvedValue(createdUser);

    await service.execute({ ...dto, verified: true });

    expect(repo.create).toHaveBeenCalledWith(expect.objectContaining({ verified: true }));
  });

  it("throws ConflictException when the email is already in use", async () => {
    repo.findByEmail.mockResolvedValue(createdUser);

    await expect(service.execute(dto)).rejects.toThrow(ConflictException);
    expect(repo.findByUsername).not.toHaveBeenCalled();
    expect(repo.create).not.toHaveBeenCalled();
  });

  it("throws ConflictException when the username is already in use", async () => {
    repo.findByEmail.mockResolvedValue(null);
    repo.findByUsername.mockResolvedValue(createdUser);

    await expect(service.execute(dto)).rejects.toThrow(ConflictException);
    expect(repo.create).not.toHaveBeenCalled();
  });
});
