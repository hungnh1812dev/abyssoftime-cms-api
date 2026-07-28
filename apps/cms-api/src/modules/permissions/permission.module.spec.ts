import { MODULE_METADATA } from "@nestjs/common/constants";

import { CreatePermissionService } from "./application/services/create-permission.service";
import { DeletePermissionService } from "./application/services/delete-permission.service";
import { ListPermissionService } from "./application/services/list-permission.service";
import { UpdatePermissionService } from "./application/services/update-permission.service";
import { PERMISSSION_REPOSITORY } from "./domain/repositories/permission.repository";
import { PrismaPermissionRepository } from "./infrastructure/persistence/prisma-permission.repository";
import { PermissionModule } from "./permission.module";
import { PermissionController } from "./presentation/permission.controller";

describe("PermissionModule", () => {
  it("declares no imports", () => {
    expect(Reflect.getMetadata(MODULE_METADATA.IMPORTS, PermissionModule)).toEqual([]);
  });

  it("registers the PermissionController", () => {
    expect(Reflect.getMetadata(MODULE_METADATA.CONTROLLERS, PermissionModule)).toEqual([PermissionController]);
  });

  it("registers the CRUD services and binds PERMISSSION_REPOSITORY to PrismaPermissionRepository", () => {
    const providers = Reflect.getMetadata(MODULE_METADATA.PROVIDERS, PermissionModule) as unknown[];

    expect(providers).toEqual([
      ListPermissionService,
      CreatePermissionService,
      UpdatePermissionService,
      DeletePermissionService,
      { provide: PERMISSSION_REPOSITORY, useClass: PrismaPermissionRepository },
    ]);
  });

  it("exports PERMISSSION_REPOSITORY", () => {
    expect(Reflect.getMetadata(MODULE_METADATA.EXPORTS, PermissionModule)).toEqual([PERMISSSION_REPOSITORY]);
  });
});
