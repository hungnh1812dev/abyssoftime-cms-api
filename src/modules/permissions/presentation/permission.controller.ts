import { CreatePermissionDto } from "../application/dto/create-permission.dto";
import { UpdatePermissionDto } from "../application/dto/update-permission.dto";
import { CreatePermissionService } from "../application/services/create-permission.service";
import { DeletePermissionService } from "../application/services/delete-permission.service";
import { ListPermissionService } from "../application/services/list-permission.service";
import { UpdatePermissionService } from "../application/services/update-permission.service";
import { PermissionEntity } from "../domain/entities/permission.entity";

import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Post, Put } from "@nestjs/common";

@Controller("/api/permissions")
export class PermissionController {
  constructor(
    private readonly listPermissions: ListPermissionService,
    private readonly createPermission: CreatePermissionService,
    private readonly updatePermission: UpdatePermissionService,
    private readonly deletePermission: DeletePermissionService,
  ) {}

  @Get()
  async list(): Promise<PermissionEntity[]> {
    return this.listPermissions.execute();
  }

  @Post()
  async create(@Body() dto: CreatePermissionDto): Promise<PermissionEntity> {
    return this.createPermission.execute(dto);
  }

  @Put(":id")
  async update(@Param("id") documentId: string, @Body() dto: UpdatePermissionDto): Promise<PermissionEntity> {
    return this.updatePermission.execute(documentId, dto);
  }

  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(@Param("id") documentId: string): Promise<void> {
    return this.deletePermission.execute(documentId);
  }
}
