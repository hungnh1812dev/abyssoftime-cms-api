import { CreateRoleDto } from "../application/dto/create-role.dto";
import { UpdateRoleDto } from "../application/dto/update-role.dto";
import { CreateRoleService } from "../application/services/create-role.service";
import { DeleteRoleService } from "../application/services/delete-role.service";
import { ListRolesService } from "../application/services/list-roles.service";
import { UpdateRoleService } from "../application/services/update-role.service";
import { RoleEntity } from "../domain/entities/role.entiry";

import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Post, Put, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";

import { RequirePermissions } from "@/common/decorators/require-permissions.decorator";
import { JwtAuthGuard } from "@/common/guards/jwt-auth.guard";
import { PermissionsGuard } from "@/common/guards/permissions.guard";

import { RoleResponseDto } from "./dto/role-response.dto";

@ApiTags("roles")
@ApiBearerAuth()
@Controller("roles")
export class RolesColtroller {
  constructor(
    private readonly listRolesService: ListRolesService,
    private readonly createRoleService: CreateRoleService,
    private readonly updateRoleService: UpdateRoleService,
    private readonly dalateRoleService: DeleteRoleService,
  ) {}

  @Get()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions("role:read")
  @ApiOperation({ summary: "List all roles" })
  @ApiResponse({ status: 200, type: [RoleResponseDto] })
  async list(): Promise<RoleEntity[]> {
    return this.listRolesService.execute();
  }

  @Post()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions("role:manager")
  @ApiOperation({ summary: "Create a role" })
  @ApiResponse({ status: 201, type: RoleResponseDto })
  @ApiResponse({ status: 400, description: "One or more permission slugs don't exist" })
  @ApiResponse({ status: 409, description: "Slug already exists" })
  async create(@Body() dto: CreateRoleDto): Promise<RoleEntity> {
    return this.createRoleService.execute(dto);
  }

  @Put(":id")
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions("role:manager")
  @ApiOperation({ summary: "Update a role" })
  @ApiResponse({ status: 200, type: RoleResponseDto })
  @ApiResponse({ status: 400, description: "Default role's name/level can't change, or an unknown permission slug was given" })
  @ApiResponse({ status: 404, description: "Role not found" })
  async update(@Param("id") documentId: string, @Body() dto: UpdateRoleDto): Promise<RoleEntity> {
    return this.updateRoleService.execute(documentId, dto);
  }

  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions("role:manager")
  @ApiOperation({ summary: "Delete a role" })
  @ApiResponse({ status: 204, description: "Deleted" })
  @ApiResponse({ status: 400, description: "Default roles cannot be deleted" })
  @ApiResponse({ status: 404, description: "Role not found" })
  @ApiResponse({ status: 409, description: "Still assigned to one or more users" })
  async delete(@Param("id") documentId: string): Promise<void> {
    return this.dalateRoleService.execute(documentId);
  }
}
