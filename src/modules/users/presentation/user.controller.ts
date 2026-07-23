import { CreateUserDto } from "../application/dto/create-user.dto";
import { UpdateUserDto } from "../application/dto/update-user.dto";
import { CreateUserService } from "../application/services/create-user.service";
import { DeleteUserService } from "../application/services/delete-user.service";
import { ListUserService } from "../application/services/list-user.service";
import { UpdateUserService } from "../application/services/update-user.service";
import { UserEntity } from "../domain/entities/user.entity";

import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Post, Put } from "@nestjs/common";

@Controller("/api/users")
export class UserController {
  constructor(
    private readonly listUsers: ListUserService,
    private readonly createUser: CreateUserService,
    private readonly updateUser: UpdateUserService,
    private readonly deleteUser: DeleteUserService,
  ) {}

  @Get()
  async list(): Promise<UserEntity[]> {
    return this.listUsers.execute();
  }

  @Post()
  async create(@Body() dto: CreateUserDto): Promise<UserEntity> {
    return this.createUser.execute(dto);
  }

  @Put(":id")
  async update(@Param("id") documentId: string, @Body() dto: UpdateUserDto): Promise<UserEntity> {
    return this.updateUser.execute(documentId, dto);
  }

  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(@Param("id") documentId: string): Promise<void> {
    return this.deleteUser.execute(documentId);
  }
}
