import { CreatePermissionDto } from "../application/dto/create-permission.dto";
import { UpdatePermissionDto } from "../application/dto/update-permission.dto";
import { CreatePermissionService } from "../application/services/create-permission.service";
import { DeletePermissionService } from "../application/services/delete-permission.service";
import { ListPermissionService } from "../application/services/list-permission.service";
import { UpdatePermissionService } from "../application/services/update-permission.service";
import { PermissionEntity } from "../domain/entities/permission.entity";

import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Post, Put, UseGuards } from "@nestjs/common";

import { RequirePermissions } from "@/common/decorators/require-permissions.decorator";
import { JwtAuthGuard } from "@/common/guards/jwt-auth.guard";
import { PermissionsGuard } from "@/common/guards/permissions.guard";

@Controller("/api/permissions")
export class PermissionController {
  constructor(
    private readonly listPermissions: ListPermissionService,
    private readonly createPermission: CreatePermissionService,
    private readonly updatePermission: UpdatePermissionService,
    private readonly deletePermission: DeletePermissionService,
  ) {}

  @Get()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions("permission:read")
  async list(): Promise<PermissionEntity[]> {
    return this.listPermissions.execute();
  }

  @Post()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions("permission:manager")
  async create(@Body() dto: CreatePermissionDto): Promise<PermissionEntity> {
    return this.createPermission.execute(dto);
  }

  @Put(":id")
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions("permission:manager")
  async update(@Param("id") documentId: string, @Body() dto: UpdatePermissionDto): Promise<PermissionEntity> {
    return this.updatePermission.execute(documentId, dto);
  }

  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions("permission:manager")
  async delete(@Param("id") documentId: string): Promise<void> {
    return this.deletePermission.execute(documentId);
  }
}
