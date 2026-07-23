import { CreateRoleDto } from "../application/dto/create-role.dto";
import { UpdateRoleDto } from "../application/dto/update-role.dto";
import { CreateRoleService } from "../application/services/create-role.service";
import { DeleteRoleService } from "../application/services/delete-role.service";
import { UpdateRoleService } from "../application/services/update-role.service";
import { RoleEntity } from "../domain/entities/role.entiry";
import { Request } from "express";

import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Post, Put, Req } from "@nestjs/common";

import { ListRolesService } from "./../application/services/list-roles.service";

/** Populated by the auth guard/middleware once real auth is implemented; empty until then. */
export type AuthenticatedRequest = Request & { user?: { roleSlug: string } };

@Controller("/api/roles")
export class RolesColtroller {
  constructor(
    private readonly listRolesService: ListRolesService,
    private readonly createRoleService: CreateRoleService,
    private readonly updateRoleService: UpdateRoleService,
    private readonly dalateRoleService: DeleteRoleService,
  ) {}

  @Get()
  async list(): Promise<RoleEntity[]> {
    return this.listRolesService.execute();
  }

  @Post()
  async create(@Body() dto: CreateRoleDto, @Req() req: AuthenticatedRequest): Promise<RoleEntity> {
    return this.createRoleService.execute(dto, this.callerRoleSlug(req));
  }

  @Put(":id")
  async update(@Param("id") documentId: string, @Body() dto: UpdateRoleDto, @Req() req: AuthenticatedRequest): Promise<RoleEntity> {
    return this.updateRoleService.execute(documentId, dto, this.callerRoleSlug(req));
  }

  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(@Param("id") documentId: string, @Req() req: AuthenticatedRequest): Promise<void> {
    return this.dalateRoleService.execute(documentId, this.callerRoleSlug(req));
  }

  private callerRoleSlug(req: AuthenticatedRequest): string {
    return req.user?.roleSlug ?? "";
  }
}
