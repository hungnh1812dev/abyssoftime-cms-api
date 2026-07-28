import { PermissionModule } from "../modules/permissions/permission.module";
import { RoleModule } from "../modules/roles/role.module";

import { MODULE_METADATA } from "@nestjs/common/constants";

import { SeedDefaultDataService } from "./seed-default-data.service";
import { SeedModule } from "./seed.module";

describe("SeedModule", () => {
  it("imports PermissionModule and RoleModule", () => {
    expect(Reflect.getMetadata(MODULE_METADATA.IMPORTS, SeedModule)).toEqual([PermissionModule, RoleModule]);
  });

  it("provides SeedDefaultDataService", () => {
    expect(Reflect.getMetadata(MODULE_METADATA.PROVIDERS, SeedModule)).toEqual([SeedDefaultDataService]);
  });

  it("declares no controllers or exports", () => {
    expect(Reflect.getMetadata(MODULE_METADATA.CONTROLLERS, SeedModule)).toBeUndefined();
    expect(Reflect.getMetadata(MODULE_METADATA.EXPORTS, SeedModule)).toBeUndefined();
  });
});
