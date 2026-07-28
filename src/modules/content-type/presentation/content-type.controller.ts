import { UpdateListFieldsDto } from "../application/dto/update-list-fields.dto";
import { assertSafeSlug, UnsafeSqlIdentifierError } from "../application/schema/sql-identifier";
import { GetContentTypeService } from "../application/services/get-content-type.service";
import { ListContentTypeService } from "../application/services/list-content-type.service";
import { UpdateListFieldsService } from "../application/services/update-list-fields.service";
import { ContentTypeEntity, ContentTypeSummary } from "../domain/entities/content-type.entity";

import { BadRequestException, Body, Controller, Get, Param, Patch, UseGuards } from "@nestjs/common";
import { ApiCookieAuth, ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";

import { RequirePermissions } from "@/common/decorators/require-permissions.decorator";
import { JwtAuthGuard } from "@/common/guards/jwt-auth.guard";
import { PermissionsGuard } from "@/common/guards/permissions.guard";

import { ContentTypeResponseDto, ContentTypeSummaryResponseDto } from "./dto/content-type-response.dto";

// Schema (fields/kind/draftToPublish) is read-only by design — edited only by changing a
// content-types/*.json file and rebooting (the sync engine reconciles it). listFields is the one
// admin-mutable exception, via PATCH :slug/list-fields (content_type:manager only).
@ApiTags("content-types")
@ApiCookieAuth()
@Controller("content-types")
export class ContentTypeController {
  constructor(
    private readonly listContentTypeService: ListContentTypeService,
    private readonly getContentTypeService: GetContentTypeService,
    private readonly updateListFieldsService: UpdateListFieldsService,
  ) {}

  @Get()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions("content_type:read")
  @ApiOperation({ summary: "List all content types (summary projection)" })
  @ApiResponse({ status: 200, type: [ContentTypeSummaryResponseDto] })
  async list(): Promise<ContentTypeSummary[]> {
    return this.listContentTypeService.execute();
  }

  @Get(":slug")
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions("content_type:read")
  @ApiOperation({ summary: "Get a content type's full schema by slug" })
  @ApiResponse({ status: 200, type: ContentTypeResponseDto })
  @ApiResponse({ status: 400, description: "Unsafe/malformed slug" })
  @ApiResponse({ status: 404, description: "No content type with that slug" })
  async getBySlug(@Param("slug") slug: string): Promise<ContentTypeEntity> {
    validateSlugParam(slug);
    return this.getContentTypeService.execute(slug);
  }

  @Patch(":slug/list-fields")
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions("content_type:manager")
  @ApiOperation({ summary: "Set the columns shown by default in a content type's list view" })
  @ApiResponse({ status: 200, type: ContentTypeResponseDto })
  @ApiResponse({ status: 400, description: "Unsafe/malformed slug, empty array, or an entry that isn't a listable system column or eligible field" })
  @ApiResponse({ status: 404, description: "No content type with that slug" })
  async updateListFields(@Param("slug") slug: string, @Body() dto: UpdateListFieldsDto): Promise<ContentTypeEntity> {
    validateSlugParam(slug);
    return this.updateListFieldsService.execute(slug, dto.listFields);
  }
}

function validateSlugParam(slug: string): void {
  try {
    assertSafeSlug(slug);
  } catch (error) {
    if (error instanceof UnsafeSqlIdentifierError) {
      throw new BadRequestException(error.message);
    }
    throw error;
  }
}
