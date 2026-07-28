import { Module } from "@nestjs/common";

import { PermissionModule } from "@/modules/permissions/permission.module";

import { CreateRoleService } from "./application/services/create-role.service";
import { DeleteRoleService } from "./application/services/delete-role.service";
import { ListRolesService } from "./application/services/list-roles.service";
import { UpdateRoleService } from "./application/services/update-role.service";
import { ROLE_REPOSITORY } from "./domain/repositories/role.repository";
import { USER_ROLE_COUNT_REPOSITORY } from "./domain/repositories/user-role-count.repository";
import { PrismaRoleRepository } from "./infrastructure/persistence/prisma-role.repository";
import { PrismaUserRoleCountRepository } from "./infrastructure/persistence/prisma-user-role-count.repository";
import { RolesColtroller } from "./presentation/role.controller";

@Module({
  imports: [PermissionModule],
  controllers: [RolesColtroller],
  providers: [
    ListRolesService,
    CreateRoleService,
    UpdateRoleService,
    DeleteRoleService,
    { provide: ROLE_REPOSITORY, useClass: PrismaRoleRepository },
    { provide: USER_ROLE_COUNT_REPOSITORY, useClass: PrismaUserRoleCountRepository },
  ],
  exports: [ROLE_REPOSITORY, USER_ROLE_COUNT_REPOSITORY],
})
export class RoleModule {}
