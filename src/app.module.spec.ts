import { MODULE_METADATA } from "@nestjs/common/constants";

import { AppController } from "./app.controller";
import { AppModule } from "./app.module";
import { AppService } from "./app.service";
import { SeedModule } from "./bootstrap/seed.module";
import { TokenModule } from "./common/token/token.module";
import { ConfigModule } from "./config/config.module";
import { AuthModule } from "./modules/auth/auth.module";
import { PermissionModule } from "./modules/permissions/permission.module";
import { RoleModule } from "./modules/roles/role.module";
import { UserModule } from "./modules/users/user.module";
import { PrismaModule } from "./prisma/prisma.module";

jest.mock("./config/config.module", () => ({ ConfigModule: class MockConfigModule {} }));

describe("AppModule", () => {
  it("imports every feature module, with ConfigModule loaded first", () => {
    expect(Reflect.getMetadata(MODULE_METADATA.IMPORTS, AppModule)).toEqual([
      ConfigModule,
      PrismaModule,
      TokenModule,
      PermissionModule,
      RoleModule,
      UserModule,
      AuthModule,
      SeedModule,
    ]);
  });

  it("registers AppController and AppService", () => {
    expect(Reflect.getMetadata(MODULE_METADATA.CONTROLLERS, AppModule)).toEqual([AppController]);
    expect(Reflect.getMetadata(MODULE_METADATA.PROVIDERS, AppModule)).toEqual([AppService]);
  });
});
