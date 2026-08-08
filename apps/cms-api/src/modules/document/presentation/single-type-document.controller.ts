import { GetSingleTypeService } from "../application/services/get-single-type.service";
import { PublishSingleTypeService } from "../application/services/publish-single-type.service";
import { SaveSingleTypeService } from "../application/services/save-single-type.service";
import { UnpublishSingleTypeService } from "../application/services/unpublish-single-type.service";

import { Body, Controller, Get, HttpCode, HttpStatus, Inject, Param, Post, Put, Req, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";

import { RequirePermissions } from "@/common/decorators/require-permissions.decorator";
import { DocumentPermissionsGuard } from "@/common/guards/document-permissions.guard";
import { JwtAuthGuard } from "@/common/guards/jwt-auth.guard";
import { type AuthenticatedRequest } from "@/common/types/authenticated-request";
import { type IUserRepository, USER_REPOSITORY } from "@/modules/users/domain/repositories/user.repository";

import { type DocumentResponse, type ResolvedUpdatedBy, toDocumentResponse } from "./document-response.mapper";
import { DocumentResponseDto, PublishStatusResponseDto } from "./dto/document-response.dto";
import { SaveDocumentDto } from "./dto/save-document.dto";
import { validateSlugParam } from "./validate-params";

// No DELETE route — single-types are never deleted (at most one entry ever exists).
@ApiTags("documents-single-type")
@ApiBearerAuth()
@Controller("documents/single-type")
export class SingleTypeDocumentController {
  constructor(
    private readonly getSingleType: GetSingleTypeService,
    private readonly saveSingleType: SaveSingleTypeService,
    private readonly publishSingleType: PublishSingleTypeService,
    private readonly unpublishSingleType: UnpublishSingleTypeService,
    @Inject(USER_REPOSITORY) private readonly users: IUserRepository,
  ) {}

  @Get(":slug")
  @UseGuards(JwtAuthGuard, DocumentPermissionsGuard)
  @RequirePermissions("document:read")
  @ApiOperation({ summary: "Get the single-type document (draft in Mode A, published in Mode B)" })
  @ApiResponse({ status: 200, type: DocumentResponseDto })
  @ApiResponse({ status: 404, description: "No document exists yet for this content type" })
  async get(@Param("slug") slug: string): Promise<DocumentResponse> {
    validateSlugParam(slug);

    const { document, status } = await this.getSingleType.execute(slug);
    const updatedBy = await this.resolveUpdatedBy(document.updatedBy);
    return toDocumentResponse(document, status, updatedBy);
  }

  @Put(":slug")
  @UseGuards(JwtAuthGuard, DocumentPermissionsGuard)
  @RequirePermissions("document:update")
  @ApiOperation({ summary: "Create or update the single-type document" })
  @ApiResponse({ status: 200, type: DocumentResponseDto })
  async save(@Param("slug") slug: string, @Body() dto: SaveDocumentDto, @Req() req: AuthenticatedRequest): Promise<DocumentResponse> {
    validateSlugParam(slug);

    await this.saveSingleType.execute(slug, dto.data, req.user.sub);
    const { document, status } = await this.getSingleType.execute(slug);
    const updatedBy = await this.resolveUpdatedBy(document.updatedBy);
    return toDocumentResponse(document, status, updatedBy);
  }

  @Post(":slug/publish")
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, DocumentPermissionsGuard)
  @RequirePermissions("document:publish")
  @ApiOperation({ summary: "Publish the draft (Mode A only)" })
  @ApiResponse({ status: 200, type: PublishStatusResponseDto })
  @ApiResponse({ status: 400, description: "Content type has draftToPublish disabled (Mode B)" })
  async publish(@Param("slug") slug: string, @Req() req: AuthenticatedRequest): Promise<{ status: "published" }> {
    validateSlugParam(slug);

    await this.publishSingleType.execute(slug, req.user.sub);
    return { status: "published" };
  }

  @Post(":slug/unpublish")
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, DocumentPermissionsGuard)
  @RequirePermissions("document:unpublish")
  @ApiOperation({ summary: "Unpublish (Mode A only) — draft is left untouched" })
  @ApiResponse({ status: 200, type: PublishStatusResponseDto })
  @ApiResponse({ status: 400, description: "Content type has draftToPublish disabled (Mode B)" })
  async unpublish(@Param("slug") slug: string): Promise<{ status: "draft" }> {
    validateSlugParam(slug);

    await this.unpublishSingleType.execute(slug);
    return { status: "draft" };
  }

  private async resolveUpdatedBy(userId: string | null): Promise<ResolvedUpdatedBy | null> {
    if (!userId) {
      return null;
    }
    const user = await this.users.findById(userId);
    return user ? { documentId: user.documentId, name: user.name } : null;
  }
}
