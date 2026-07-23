import { CreateRoleDto } from "../application/dto/create-role.dto";
import { UpdateRoleDto } from "../application/dto/update-role.dto";
import { CreateRoleService } from "../application/services/create-role.service";
import { DeleteRoleService } from "../application/services/delete-role.service";
import { UpdateRoleService } from "../application/services/update-role.service";
import { RoleEntity } from "../domain/entities/role.entiry";

import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Post, Put, UseGuards } from "@nestjs/common";

import { RequirePermissions } from "@/common/decorators/require-permissions.decorator";
import { JwtAuthGuard } from "@/common/guards/jwt-auth.guard";
import { PermissionsGuard } from "@/common/guards/permissions.guard";

import { ListRolesService } from "./../application/services/list-roles.service";

@Controller("/api/roles")
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
  async list(): Promise<RoleEntity[]> {
    return this.listRolesService.execute();
  }

  @Post()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions("role:manager")
  async create(@Body() dto: CreateRoleDto): Promise<RoleEntity> {
    return this.createRoleService.execute(dto);
  }

  @Put(":id")
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions("role:manager")
  async update(@Param("id") documentId: string, @Body() dto: UpdateRoleDto): Promise<RoleEntity> {
    return this.updateRoleService.execute(documentId, dto);
  }

  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions("role:manager")
  async delete(@Param("id") documentId: string): Promise<void> {
    return this.dalateRoleService.execute(documentId);
  }
}
