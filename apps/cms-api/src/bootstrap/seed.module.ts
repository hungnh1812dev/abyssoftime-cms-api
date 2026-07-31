import { PermissionModule } from "../modules/permissions/permission.module";
import { RoleModule } from "../modules/roles/role.module";

import { Module } from "@nestjs/common";

import { SeedDefaultDataService } from "./seed-default-data.service";

@Module({
  imports: [PermissionModule, RoleModule],
  providers: [SeedDefaultDataService],
})
export class SeedModule {}
