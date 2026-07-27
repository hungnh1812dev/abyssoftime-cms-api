import { GetSingleTypeService } from "../application/services/get-single-type.service";
import { PublishSingleTypeService } from "../application/services/publish-single-type.service";
import { SaveSingleTypeService } from "../application/services/save-single-type.service";
import { UnpublishSingleTypeService } from "../application/services/unpublish-single-type.service";

import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post, Put, Req, UseGuards } from "@nestjs/common";

import { RequirePermissions } from "@/common/decorators/require-permissions.decorator";
import { JwtAuthGuard } from "@/common/guards/jwt-auth.guard";
import { PermissionsGuard } from "@/common/guards/permissions.guard";
import { type AuthenticatedRequest } from "@/common/types/authenticated-request";

import { type DocumentResponse, toDocumentResponse } from "./document-response.mapper";
import { SaveDocumentDto } from "./dto/save-document.dto";
import { validateSlugParam } from "./validate-params";

@Controller("/api/documents/single-type")
export class SingleTypeDocumentController {
  constructor(
    private readonly getSingleType: GetSingleTypeService,
    private readonly saveSingleType: SaveSingleTypeService,
    private readonly publishSingleType: PublishSingleTypeService,
    private readonly unpublishSingleType: UnpublishSingleTypeService,
  ) {}

  @Get(":slug")
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions("document:read")
  async get(@Param("slug") slug: string): Promise<DocumentResponse> {
    validateSlugParam(slug);

    const { document, status } = await this.getSingleType.execute(slug);
    return toDocumentResponse(document, status);
  }

  @Put(":slug")
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions("document:update")
  async save(@Param("slug") slug: string, @Body() dto: SaveDocumentDto, @Req() req: AuthenticatedRequest): Promise<DocumentResponse> {
    validateSlugParam(slug);

    await this.saveSingleType.execute(slug, dto.data, req.user.sub);
    const { document, status } = await this.getSingleType.execute(slug);
    return toDocumentResponse(document, status);
  }

  @Post(":slug/publish")
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions("document:publish")
  async publish(@Param("slug") slug: string, @Req() req: AuthenticatedRequest): Promise<{ status: "published" }> {
    validateSlugParam(slug);

    await this.publishSingleType.execute(slug, req.user.sub);
    return { status: "published" };
  }

  @Post(":slug/unpublish")
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions("document:unpublish")
  async unpublish(@Param("slug") slug: string): Promise<{ status: "draft" }> {
    validateSlugParam(slug);

    await this.unpublishSingleType.execute(slug);
    return { status: "draft" };
  }
}
