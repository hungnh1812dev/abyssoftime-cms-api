import { CreateUserDto } from "../application/dto/create-user.dto";
import { UpdateUserDto } from "../application/dto/update-user.dto";
import { CreateUserService } from "../application/services/create-user.service";
import { DeleteUserService } from "../application/services/delete-user.service";
import { ListUserService } from "../application/services/list-user.service";
import { UpdateUserService } from "../application/services/update-user.service";
import { UserEntity } from "../domain/entities/user.entity";

import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Post, Put, Req, UseGuards } from "@nestjs/common";

import { RequirePermissions } from "@/common/decorators/require-permissions.decorator";
import { JwtAuthGuard } from "@/common/guards/jwt-auth.guard";
import { PermissionsGuard } from "@/common/guards/permissions.guard";
import { type AuthenticatedRequest } from "@/common/types/authenticated-request";

@Controller("/api/users")
export class UserController {
  constructor(
    private readonly listUsers: ListUserService,
    private readonly createUser: CreateUserService,
    private readonly updateUser: UpdateUserService,
    private readonly deleteUser: DeleteUserService,
  ) {}

  @Get()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions("user:read")
  async list(): Promise<UserEntity[]> {
    return this.listUsers.execute();
  }

  @Post()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions("user:manager")
  async create(@Body() dto: CreateUserDto): Promise<UserEntity> {
    return this.createUser.execute(dto);
  }

  @Put(":id")
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions("user:manager")
  async update(@Param("id") documentId: string, @Body() dto: UpdateUserDto, @Req() req: AuthenticatedRequest): Promise<UserEntity> {
    return this.updateUser.execute(documentId, dto, req.user);
  }

  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions("user:manager")
  async delete(@Param("id") documentId: string, @Req() req: AuthenticatedRequest): Promise<void> {
    return this.deleteUser.execute(documentId, req.user);
  }
}
