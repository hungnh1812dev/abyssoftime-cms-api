import { Test } from "@nestjs/testing";

import { CreateUserDto } from "../application/dto/create-user.dto";
import { UpdateUserDto } from "../application/dto/update-user.dto";
import { CreateUserService } from "../application/services/create-user.service";
import { DeleteUserService } from "../application/services/delete-user.service";
import { ListUserService } from "../application/services/list-user.service";
import { UpdateUserService } from "../application/services/update-user.service";
import { UserEntity } from "../domain/entities/user.entity";
import { UserController } from "./user.controller";

describe("UserController", () => {
  let controller: UserController;
  let listUsers: jest.Mocked<ListUserService>;
  let createUser: jest.Mocked<CreateUserService>;
  let updateUser: jest.Mocked<UpdateUserService>;
  let deleteUser: jest.Mocked<DeleteUserService>;

  const user = new UserEntity("user-1", "jane@example.com", "Jane Doe", "janedoe", "secret", true, false, "role-1", new Date(), new Date());

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      controllers: [UserController],
      providers: [
        { provide: ListUserService, useValue: { execute: jest.fn() } },
        { provide: CreateUserService, useValue: { execute: jest.fn() } },
        { provide: UpdateUserService, useValue: { execute: jest.fn() } },
        { provide: DeleteUserService, useValue: { execute: jest.fn() } },
      ],
    }).compile();

    controller = module.get(UserController);
    listUsers = module.get(ListUserService);
    createUser = module.get(CreateUserService);
    updateUser = module.get(UpdateUserService);
    deleteUser = module.get(DeleteUserService);
  });

  it("list() delegates to ListUserService", async () => {
    listUsers.execute.mockResolvedValue([user]);

    const result = await controller.list();

    expect(listUsers.execute).toHaveBeenCalled();
    expect(result).toEqual([user]);
  });

  it("create() delegates to CreateUserService", async () => {
    const dto: CreateUserDto = { email: "jane@example.com", name: "Jane Doe", username: "janedoe", password: "secret", accountType: true, roleId: "role-1" };
    createUser.execute.mockResolvedValue(user);

    const result = await controller.create(dto);

    expect(createUser.execute).toHaveBeenCalledWith(dto);
    expect(result).toBe(user);
  });

  it("update() delegates to UpdateUserService", async () => {
    const dto: UpdateUserDto = { name: "Jane Doe 2" };
    updateUser.execute.mockResolvedValue(user);

    const result = await controller.update("user-1", dto);

    expect(updateUser.execute).toHaveBeenCalledWith("user-1", dto);
    expect(result).toBe(user);
  });

  it("delete() delegates to DeleteUserService", async () => {
    deleteUser.execute.mockResolvedValue(undefined);

    await controller.delete("user-1");

    expect(deleteUser.execute).toHaveBeenCalledWith("user-1");
  });
});
