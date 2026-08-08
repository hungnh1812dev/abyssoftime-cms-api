import { CreateAccessTokenDto } from "../application/dto/create-access-token.dto";
import { RevokeAccessTokenDto } from "../application/dto/revoke-access-token.dto";
import { CreateAccessTokenService } from "../application/services/create-access-token.service";
import { DeleteAccessTokenService } from "../application/services/delete-access-token.service";
import { ListAccessTokensService } from "../application/services/list-access-token.service";
import { RevokeAccessTokenService } from "../application/services/revoke-access-token.service";
import { AccessTokenEntity } from "../domain/entities/access-token.entity";

import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Post, Req, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";

import { RequirePermissions } from "@/common/decorators/require-permissions.decorator";
import { JwtAuthGuard } from "@/common/guards/jwt-auth.guard";
import { PermissionsGuard } from "@/common/guards/permissions.guard";
import { type AuthenticatedRequest } from "@/common/types/authenticated-request";

import { AccessTokenResponseDto, AccessTokenSecretResponseDto } from "./dto/access-token-response.dto";

@ApiTags("access-tokens")
@ApiBearerAuth()
@Controller("access-tokens")
export class AccessTokenController {
  constructor(
    private readonly createAccessTokenService: CreateAccessTokenService,
    private readonly listAccessTokensService: ListAccessTokensService,
    private readonly deleteAccessTokenService: DeleteAccessTokenService,
    private readonly revokeAccessTokenService: RevokeAccessTokenService,
  ) {}

  @Get()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions("api_token:read")
  @ApiOperation({ summary: "List all access tokens (never includes the secret)" })
  @ApiResponse({ status: 200, type: [AccessTokenResponseDto] })
  async list(): Promise<AccessTokenResponseDto[]> {
    const entities = await this.listAccessTokensService.execute();
    return entities.map((entity) => this.toResponse(entity));
  }

  @Post()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions("api_token:manager")
  @ApiOperation({ summary: "Create an access token — returns the plaintext secret once" })
  @ApiResponse({ status: 201, type: AccessTokenSecretResponseDto })
  @ApiResponse({ status: 400, description: "One or more permission slugs don't exist" })
  async create(@Body() dto: CreateAccessTokenDto, @Req() req: AuthenticatedRequest): Promise<AccessTokenSecretResponseDto> {
    const { entity, plaintext } = await this.createAccessTokenService.execute(dto, req.user.sub);
    return this.toSecretResponse(entity, plaintext);
  }

  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions("api_token:manager")
  @ApiOperation({ summary: "Delete an access token" })
  @ApiResponse({ status: 204, description: "Deleted" })
  @ApiResponse({ status: 404, description: "Access token not found" })
  async delete(@Param("id") documentId: string): Promise<void> {
    return this.deleteAccessTokenService.execute(documentId);
  }

  @Post(":id/revoke")
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions("api_token:manager")
  @ApiOperation({ summary: "Rotate an access token's secret — returns the new plaintext secret once" })
  @ApiResponse({ status: 200, type: AccessTokenSecretResponseDto })
  @ApiResponse({ status: 400, description: "One or more permission slugs don't exist (rejected before rotating the secret)" })
  @ApiResponse({ status: 404, description: "Access token not found" })
  async revoke(@Param("id") documentId: string, @Body() dto: RevokeAccessTokenDto, @Req() req: AuthenticatedRequest): Promise<AccessTokenSecretResponseDto> {
    const { entity, plaintext } = await this.revokeAccessTokenService.execute(documentId, dto, req.user.sub);
    return this.toSecretResponse(entity, plaintext);
  }

  private toResponse(entity: AccessTokenEntity): AccessTokenResponseDto {
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

  private toSecretResponse(entity: AccessTokenEntity, plaintext: string): AccessTokenSecretResponseDto {
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
