import { CreateAccessTokenDto } from "../application/dto/create-access-token.dto";
import { CreateAccessTokenService } from "../application/services/create-access-token.service";
import { AccessTokenEntity } from "../domain/entities/access-token.entity";

import { Body, Controller, Post, Req, UseGuards } from "@nestjs/common";

import { RequirePermissions } from "@/common/decorators/require-permissions.decorator";
import { JwtAuthGuard } from "@/common/guards/jwt-auth.guard";
import { PermissionsGuard } from "@/common/guards/permissions.guard";
import { type AuthenticatedRequest } from "@/common/types/authenticated-request";

interface AccessTokenSecretResponse {
  documentId: string;
  name: string;
  permissions: string[];
  expiresAt: Date | null;
  token: string;
  createdAt: Date;
  updatedAt: Date;
}

@Controller("/api/access-tokens")
export class AccessTokenController {
  constructor(private readonly createAccessTokenService: CreateAccessTokenService) {}

  @Post()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions("api_token:manager")
  async create(@Body() dto: CreateAccessTokenDto, @Req() req: AuthenticatedRequest): Promise<AccessTokenSecretResponse> {
    const { entity, plaintext } = await this.createAccessTokenService.execute(dto, req.user.sub);
    return this.toSecretResponse(entity, plaintext);
  }

  private toSecretResponse(entity: AccessTokenEntity, plaintext: string): AccessTokenSecretResponse {
    return {
      documentId: entity.documentId,
      name: entity.name,
      permissions: entity.permissions,
      expiresAt: entity.expiresAt,
      token: plaintext,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    };
  }
}
