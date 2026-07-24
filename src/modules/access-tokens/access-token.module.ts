import { Module } from "@nestjs/common";

import { PermissionModule } from "@/modules/permissions/permission.module";

import { CreateAccessTokenService } from "./application/services/create-access-token.service";
import { DeleteAccessTokenService } from "./application/services/delete-access-token.service";
import { ListAccessTokensService } from "./application/services/list-access-token.service";
import { RevokeAccessTokenService } from "./application/services/revoke-access-token.service";
import { ACCESS_TOKEN_REPOSITORY } from "./domain/repositories/access-token.repository";
import { PrismaAccessTokenRepository } from "./infrastructure/persistence/prisma-access-token.repository";
import { AccessTokenController } from "./presentation/access-token.controller";

@Module({
  imports: [PermissionModule],
  controllers: [AccessTokenController],
  providers: [
    ListAccessTokensService,
    CreateAccessTokenService,
    RevokeAccessTokenService,
    DeleteAccessTokenService,
    { provide: ACCESS_TOKEN_REPOSITORY, useClass: PrismaAccessTokenRepository },
  ],
  exports: [ACCESS_TOKEN_REPOSITORY],
})
export class AccessTokenModule {}
