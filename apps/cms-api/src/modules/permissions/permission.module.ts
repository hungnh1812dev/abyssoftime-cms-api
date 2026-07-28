import { Module } from "@nestjs/common";

import { CreatePermissionService } from "./application/services/create-permission.service";
import { DeletePermissionService } from "./application/services/delete-permission.service";
import { ListPermissionService } from "./application/services/list-permission.service";
import { UpdatePermissionService } from "./application/services/update-permission.service";
import { PERMISSSION_REPOSITORY } from "./domain/repositories/permission.repository";
import { PrismaPermissionRepository } from "./infrastructure/persistence/prisma-permission.repository";
import { PermissionController } from "./presentation/permission.controller";

@Module({
  imports: [],
  controllers: [PermissionController],
  providers: [
    ListPermissionService,
    CreatePermissionService,
    UpdatePermissionService,
    DeletePermissionService,
    { provide: PERMISSSION_REPOSITORY, useClass: PrismaPermissionRepository },
  ],
  exports: [PERMISSSION_REPOSITORY],
})
export class PermissionModule {}
