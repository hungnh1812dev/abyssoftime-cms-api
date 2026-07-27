import { UpdateUserRoleDto } from "../application/dto/update-user-role.dto";
import { UpdateUserDto } from "../application/dto/update-user.dto";
import { DeleteUserService } from "../application/services/delete-user.service";
import { ListUserService } from "../application/services/list-user.service";
import { UpdateUserRoleService } from "../application/services/update-user-role.service";
import { UpdateUserService } from "../application/services/update-user.service";

import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Put, Req, UseGuards } from "@nestjs/common";
import { ApiCookieAuth, ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";

import { RequirePermissions } from "@/common/decorators/require-permissions.decorator";
import { JwtAuthGuard } from "@/common/guards/jwt-auth.guard";
import { PermissionsGuard } from "@/common/guards/permissions.guard";
import { type AuthenticatedRequest } from "@/common/types/authenticated-request";

import { UserResponseDto } from "./user-response.dto";

@ApiTags("users")
@ApiCookieAuth()
@Controller("/api/users")
export class UserController {
  constructor(
    private readonly listUsers: ListUserService,
    private readonly updateUser: UpdateUserService,
    private readonly updateUserRole: UpdateUserRoleService,
    private readonly deleteUser: DeleteUserService,
  ) {}

  @Get()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions("user:read")
  @ApiOperation({ summary: "List all users" })
  @ApiResponse({ status: 200, type: [UserResponseDto] })
  async list(): Promise<UserResponseDto[]> {
    const users = await this.listUsers.execute();
    return users.map((user) => UserResponseDto.fromEntity(user));
  }

  @Put(":id")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "Update a user's name/password — the caller's own record, or any user's if the caller holds user:manager" })
  @ApiResponse({ status: 200, type: UserResponseDto })
  @ApiResponse({ status: 403, description: "Caller is updating someone else's record without holding user:manager" })
  @ApiResponse({ status: 404, description: "User not found" })
  async update(@Param("id") documentId: string, @Body() dto: UpdateUserDto, @Req() req: AuthenticatedRequest): Promise<UserResponseDto> {
    const user = await this.updateUser.execute(documentId, dto, req.user);
    return UserResponseDto.fromEntity(user);
  }

  @Patch(":id/role")
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions("user:role_manager")
  @ApiOperation({ summary: "Assign a role to a user" })
  @ApiResponse({ status: 200, type: UserResponseDto })
  @ApiResponse({
    status: 403,
    description: "Caller's role level doesn't outrank the target's current or new role, or the target is being promoted to super_admin by a non-super_admin caller",
  })
  @ApiResponse({ status: 404, description: "User or role not found" })
  async updateRole(@Param("id") documentId: string, @Body() dto: UpdateUserRoleDto, @Req() req: AuthenticatedRequest): Promise<UserResponseDto> {
    const user = await this.updateUserRole.execute(documentId, dto, req.user);
    return UserResponseDto.fromEntity(user);
  }

  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions("user:manager")
  @ApiOperation({ summary: "Delete a user" })
  @ApiResponse({ status: 204, description: "Deleted" })
  @ApiResponse({ status: 403, description: "Caller's role level doesn't outrank the target's role" })
  @ApiResponse({ status: 404, description: "User not found" })
  async delete(@Param("id") documentId: string, @Req() req: AuthenticatedRequest): Promise<void> {
    return this.deleteUser.execute(documentId, req.user);
  }
}
