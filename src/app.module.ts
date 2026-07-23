import { Module } from "@nestjs/common";

import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { SeedModule } from "./bootstrap/seed.module";
import { TokenModule } from "./common/token/token.module";
import { ConfigModule } from "./config/config.module";
import { PermissionModule } from "./modules/permissions/permission.module";
import { RoleModule } from "./modules/roles/role.module";
import { UserModule } from "./modules/users/user.module";
import { PrismaModule } from "./prisma/prisma.module";

@Module({
  imports: [ConfigModule, PrismaModule, TokenModule, PermissionModule, RoleModule, UserModule, SeedModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
