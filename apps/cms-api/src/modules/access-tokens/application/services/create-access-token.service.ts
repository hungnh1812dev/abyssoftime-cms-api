import { AccessTokenEntity } from "../../domain/entities/access-token.entity";
import { ACCESS_TOKEN_REPOSITORY, type IAccessTokenRepository } from "../../domain/repositories/access-token.repository";
import { CreateAccessTokenDto } from "../dto/create-access-token.dto";

import { Inject, Injectable } from "@nestjs/common";

import { type IPermissionRepository, PERMISSSION_REPOSITORY } from "@/modules/permissions/domain/repositories/permission.repository";

import { generateAccessTokenSecret, resolveExpiresAt } from "./access-token-secret.util";
import { assertPermissionsExist } from "./assert-permissions-exist.util";

@Injectable()
export class CreateAccessTokenService {
  constructor(
    @Inject(ACCESS_TOKEN_REPOSITORY) private readonly accessTokens: IAccessTokenRepository,
    @Inject(PERMISSSION_REPOSITORY) private readonly permissions: IPermissionRepository,
  ) {}

  async execute(dto: CreateAccessTokenDto, callerId: string | null): Promise<{ entity: AccessTokenEntity; plaintext: string }> {
    await assertPermissionsExist(this.permissions, dto.permissions);

    const { plaintext, hash } = generateAccessTokenSecret();
    const expiresAt = resolveExpiresAt(dto.expiresIn);

    const entity = await this.accessTokens.create({
      name: dto.name,
      token: hash,
      permissions: dto.permissions,
      expiresAt,
      updatedBy: callerId,
    });

    return { entity, plaintext };
  }
}
