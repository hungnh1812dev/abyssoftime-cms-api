import { MODULE_METADATA } from "@nestjs/common/constants";

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
import { RoleModule } from "./role.module";

describe("RoleModule", () => {
  it("imports PermissionModule", () => {
    expect(Reflect.getMetadata(MODULE_METADATA.IMPORTS, RoleModule)).toEqual([PermissionModule]);
  });

  it("registers the RolesColtroller", () => {
    expect(Reflect.getMetadata(MODULE_METADATA.CONTROLLERS, RoleModule)).toEqual([RolesColtroller]);
  });

  it("registers the CRUD services and binds both repository tokens to their Prisma implementations", () => {
    const providers = Reflect.getMetadata(MODULE_METADATA.PROVIDERS, RoleModule) as unknown[];

    expect(providers).toEqual([
      ListRolesService,
      CreateRoleService,
      UpdateRoleService,
      DeleteRoleService,
      { provide: ROLE_REPOSITORY, useClass: PrismaRoleRepository },
      { provide: USER_ROLE_COUNT_REPOSITORY, useClass: PrismaUserRoleCountRepository },
    ]);
  });

  it("exports ROLE_REPOSITORY and USER_ROLE_COUNT_REPOSITORY", () => {
    expect(Reflect.getMetadata(MODULE_METADATA.EXPORTS, RoleModule)).toEqual([ROLE_REPOSITORY, USER_ROLE_COUNT_REPOSITORY]);
  });
});
