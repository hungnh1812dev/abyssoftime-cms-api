import { AccessTokenEntity } from "../../domain/entities/access-token.entity";
import { ACCESS_TOKEN_REPOSITORY, type IAccessTokenRepository } from "../../domain/repositories/access-token.repository";
import { RevokeAccessTokenDto } from "../dto/revoke-access-token.dto";

import { BadRequestException, Inject, Injectable, NotFoundException } from "@nestjs/common";

import { type IPermissionRepository, PERMISSSION_REPOSITORY } from "@/modules/permissions/domain/repositories/permission.repository";

import { generateAccessTokenSecret, resolveExpiresAt } from "./access-token-secret.util";

@Injectable()
export class RevokeAccessTokenService {
  constructor(
    @Inject(ACCESS_TOKEN_REPOSITORY) private readonly accessTokens: IAccessTokenRepository,
    @Inject(PERMISSSION_REPOSITORY) private readonly permissions: IPermissionRepository,
  ) {}

  async execute(documentId: string, dto: RevokeAccessTokenDto, callerId: string | null): Promise<{ entity: AccessTokenEntity; plaintext: string }> {
    const existing = await this.accessTokens.findById(documentId);
    if (!existing) {
      throw new NotFoundException(`Access token "${documentId}" not found`);
    }

    if (dto.permissions !== undefined) {
      await this.assertPermissionsExist(dto.permissions);
    }

    const { plaintext, hash } = generateAccessTokenSecret();
    const expiresAt = dto.expiresIn !== undefined ? resolveExpiresAt(dto.expiresIn) : existing.expiresAt;

    const entity = await this.accessTokens.update(documentId, {
      name: dto.name ?? existing.name,
      token: hash,
      permissions: dto.permissions ?? existing.permissions,
      expiresAt,
      updatedBy: callerId,
    });

    return { entity, plaintext };
  }

  private async assertPermissionsExist(permissionSlugs: string[]): Promise<void> {
    if (permissionSlugs.length === 0) {
      return;
    }
    const catalog = await this.permissions.findAll();
    const validSlugs = new Set(catalog.map((permission) => permission.slug));
    const invalidSlugs = permissionSlugs.filter((slug) => !validSlugs.has(slug));
    if (invalidSlugs.length > 0) {
      throw new BadRequestException(`Unknown permission slug(s): ${invalidSlugs.join(", ")}`);
    }
  }
}
