import { MODULE_METADATA } from "@nestjs/common/constants";

import { RoleModule } from "@/modules/roles/role.module";

import { CreateUserService } from "./application/services/create-user.service";
import { DeleteUserService } from "./application/services/delete-user.service";
import { ListUserService } from "./application/services/list-user.service";
import { UpdateUserRoleService } from "./application/services/update-user-role.service";
import { UpdateUserService } from "./application/services/update-user.service";
import { USER_REPOSITORY } from "./domain/repositories/user.repository";
import { PrismaUserRepository } from "./infrastructure/persistence/prisma-user.repository";
import { UserController } from "./presentation/user.controller";
import { UserModule } from "./user.module";

describe("UserModule", () => {
  it("imports RoleModule", () => {
    expect(Reflect.getMetadata(MODULE_METADATA.IMPORTS, UserModule)).toEqual([RoleModule]);
  });

  it("registers the UserController", () => {
    expect(Reflect.getMetadata(MODULE_METADATA.CONTROLLERS, UserModule)).toEqual([UserController]);
  });

  it("registers the CRUD services and binds USER_REPOSITORY to PrismaUserRepository", () => {
    const providers = Reflect.getMetadata(MODULE_METADATA.PROVIDERS, UserModule) as unknown[];

    expect(providers).toEqual([
      ListUserService,
      CreateUserService,
      UpdateUserService,
      UpdateUserRoleService,
      DeleteUserService,
      { provide: USER_REPOSITORY, useClass: PrismaUserRepository },
    ]);
  });

  it("exports USER_REPOSITORY", () => {
    expect(Reflect.getMetadata(MODULE_METADATA.EXPORTS, UserModule)).toEqual([USER_REPOSITORY]);
  });
});
