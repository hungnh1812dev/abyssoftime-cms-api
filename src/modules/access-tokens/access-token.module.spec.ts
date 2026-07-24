import { MODULE_METADATA } from "@nestjs/common/constants";

import { PermissionModule } from "@/modules/permissions/permission.module";

import { AccessTokenModule } from "./access-token.module";
import { CreateAccessTokenService } from "./application/services/create-access-token.service";
import { DeleteAccessTokenService } from "./application/services/delete-access-token.service";
import { ListAccessTokensService } from "./application/services/list-access-token.service";
import { RevokeAccessTokenService } from "./application/services/revoke-access-token.service";
import { ACCESS_TOKEN_REPOSITORY } from "./domain/repositories/access-token.repository";
import { PrismaAccessTokenRepository } from "./infrastructure/persistence/prisma-access-token.repository";
import { AccessTokenController } from "./presentation/access-token.controller";

describe("AccessTokenModule", () => {
  it("imports PermissionModule", () => {
    expect(Reflect.getMetadata(MODULE_METADATA.IMPORTS, AccessTokenModule)).toEqual([PermissionModule]);
  });

  it("registers the AccessTokenController", () => {
    expect(Reflect.getMetadata(MODULE_METADATA.CONTROLLERS, AccessTokenModule)).toEqual([AccessTokenController]);
  });

  it("registers the CRUD services and binds the repository token to its Prisma implementation", () => {
    const providers = Reflect.getMetadata(MODULE_METADATA.PROVIDERS, AccessTokenModule) as unknown[];

    expect(providers).toEqual([
      ListAccessTokensService,
      CreateAccessTokenService,
      RevokeAccessTokenService,
      DeleteAccessTokenService,
      { provide: ACCESS_TOKEN_REPOSITORY, useClass: PrismaAccessTokenRepository },
    ]);
  });

  it("exports ACCESS_TOKEN_REPOSITORY", () => {
    expect(Reflect.getMetadata(MODULE_METADATA.EXPORTS, AccessTokenModule)).toEqual([ACCESS_TOKEN_REPOSITORY]);
  });
});
