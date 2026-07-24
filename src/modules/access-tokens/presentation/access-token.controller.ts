import { CreateAccessTokenDto } from "../application/dto/create-access-token.dto";
import { CreateAccessTokenService } from "../application/services/create-access-token.service";
import { ListAccessTokensService } from "../application/services/list-access-token.service";
import { AccessTokenEntity } from "../domain/entities/access-token.entity";

import { Body, Controller, Get, Post, Req, UseGuards } from "@nestjs/common";

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

interface AccessTokenResponse {
  documentId: string;
  name: string;
  permissions: string[];
  expiresAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  updatedBy: string | null;
}

@Controller("/api/access-tokens")
export class AccessTokenController {
  constructor(
    private readonly createAccessTokenService: CreateAccessTokenService,
    private readonly listAccessTokensService: ListAccessTokensService,
  ) {}

  @Get()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions("api_token:read")
  async list(): Promise<AccessTokenResponse[]> {
    const entities = await this.listAccessTokensService.execute();
    return entities.map((entity) => this.toResponse(entity));
  }

  @Post()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions("api_token:manager")
  async create(@Body() dto: CreateAccessTokenDto, @Req() req: AuthenticatedRequest): Promise<AccessTokenSecretResponse> {
    const { entity, plaintext } = await this.createAccessTokenService.execute(dto, req.user.sub);
    return this.toSecretResponse(entity, plaintext);
  }

  private toResponse(entity: AccessTokenEntity): AccessTokenResponse {
    return {
      documentId: entity.documentId,
      name: entity.name,
      permissions: entity.permissions,
      expiresAt: entity.expiresAt,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
      updatedBy: entity.updatedBy,
    };
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
