import { CreateUserDto } from "../application/dto/create-user.dto";
import { UpdateUserRoleDto } from "../application/dto/update-user-role.dto";
import { UpdateUserDto } from "../application/dto/update-user.dto";
import { CreateUserService } from "../application/services/create-user.service";
import { DeleteUserService } from "../application/services/delete-user.service";
import { ListUserService } from "../application/services/list-user.service";
import { UpdateUserRoleService } from "../application/services/update-user-role.service";
import { UpdateUserService } from "../application/services/update-user.service";
import { UserEntity } from "../domain/entities/user.entity";

import { Test } from "@nestjs/testing";

import { JwtTokenService } from "@/common/token/jwt-token.service";
import { type AuthenticatedRequest } from "@/common/types/authenticated-request";

import { UserResponseDto } from "./user-response.dto";
import { UserController } from "./user.controller";

describe("UserController", () => {
  let controller: UserController;
  let listUsers: jest.Mocked<ListUserService>;
  let createUser: jest.Mocked<CreateUserService>;
  let updateUser: jest.Mocked<UpdateUserService>;
  let updateUserRole: jest.Mocked<UpdateUserRoleService>;
  let deleteUser: jest.Mocked<DeleteUserService>;

  const user = new UserEntity("user-1", "jane@example.com", "Jane Doe", "janedoe", "secret", true, false, "role-1", new Date(), new Date());
  const req = { user: { sub: "caller-1", roleSlug: "admin", level: 50, permissions: ["user:manager"] } } as unknown as AuthenticatedRequest;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      controllers: [UserController],
      providers: [
        { provide: ListUserService, useValue: { execute: jest.fn() } },
        { provide: CreateUserService, useValue: { execute: jest.fn() } },
        { provide: UpdateUserService, useValue: { execute: jest.fn() } },
        { provide: UpdateUserRoleService, useValue: { execute: jest.fn() } },
        { provide: DeleteUserService, useValue: { execute: jest.fn() } },
        { provide: JwtTokenService, useValue: { verifyAccessToken: jest.fn() } },
      ],
    }).compile();

    controller = module.get(UserController);
    listUsers = module.get(ListUserService);
    createUser = module.get(CreateUserService);
    updateUser = module.get(UpdateUserService);
    updateUserRole = module.get(UpdateUserRoleService);
    deleteUser = module.get(DeleteUserService);
  });

  it("list() delegates to ListUserService and strips sensitive fields from the response", async () => {
    listUsers.execute.mockResolvedValue([user]);

    const result = await controller.list();

    expect(listUsers.execute).toHaveBeenCalled();
    expect(result).toEqual([UserResponseDto.fromEntity(user)]);
    expect(result[0]).not.toHaveProperty("password");
  });

  it("create() delegates to CreateUserService and strips sensitive fields from the response", async () => {
    const dto: CreateUserDto = { email: "jane@example.com", name: "Jane Doe", username: "janedoe", password: "secret" };
    createUser.execute.mockResolvedValue(user);

    const result = await controller.create(dto);

    expect(createUser.execute).toHaveBeenCalledWith(dto);
    expect(result).toEqual(UserResponseDto.fromEntity(user));
    expect(result).not.toHaveProperty("password");
  });

  it("update() delegates to UpdateUserService with the caller from req.user and strips sensitive fields from the response", async () => {
    const dto: UpdateUserDto = { name: "Jane Doe 2" };
    updateUser.execute.mockResolvedValue(user);

    const result = await controller.update("user-1", dto, req);

    expect(updateUser.execute).toHaveBeenCalledWith("user-1", dto, req.user);
    expect(result).toEqual(UserResponseDto.fromEntity(user));
    expect(result).not.toHaveProperty("password");
  });

  it("updateRole() delegates to UpdateUserRoleService with the caller from req.user and strips sensitive fields from the response", async () => {
    const dto: UpdateUserRoleDto = { roleId: "role-2" };
    updateUserRole.execute.mockResolvedValue(user);

    const result = await controller.updateRole("user-1", dto, req);

    expect(updateUserRole.execute).toHaveBeenCalledWith("user-1", dto, req.user);
    expect(result).toEqual(UserResponseDto.fromEntity(user));
    expect(result).not.toHaveProperty("password");
  });

  it("delete() delegates to DeleteUserService with the caller from req.user", async () => {
    deleteUser.execute.mockResolvedValue(undefined);

    await controller.delete("user-1", req);

    expect(deleteUser.execute).toHaveBeenCalledWith("user-1", req.user);
  });
});
