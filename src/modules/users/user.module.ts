import { Module } from "@nestjs/common";

import { RoleModule } from "@/modules/roles/role.module";

import { CreateUserService } from "./application/services/create-user.service";
import { DeleteUserService } from "./application/services/delete-user.service";
import { ListUserService } from "./application/services/list-user.service";
import { UpdateUserRoleService } from "./application/services/update-user-role.service";
import { UpdateUserService } from "./application/services/update-user.service";
import { USER_REPOSITORY } from "./domain/repositories/user.repository";
import { PrismaUserRepository } from "./infrastructure/persistence/prisma-user.repository";
import { UserController } from "./presentation/user.controller";

@Module({
  imports: [RoleModule],
  controllers: [UserController],
  providers: [ListUserService, CreateUserService, UpdateUserService, UpdateUserRoleService, DeleteUserService, { provide: USER_REPOSITORY, useClass: PrismaUserRepository }],
  exports: [USER_REPOSITORY],
})
export class UserModule {}
