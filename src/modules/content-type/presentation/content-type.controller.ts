import { assertSafeSlug, UnsafeSqlIdentifierError } from "../application/schema/sql-identifier";
import { GetContentTypeService } from "../application/services/get-content-type.service";
import { ListContentTypeService } from "../application/services/list-content-type.service";
import { ContentTypeEntity, ContentTypeSummary } from "../domain/entities/content-type.entity";

import { BadRequestException, Controller, Get, Param, UseGuards } from "@nestjs/common";
import { ApiCookieAuth, ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";

import { RequirePermissions } from "@/common/decorators/require-permissions.decorator";
import { JwtAuthGuard } from "@/common/guards/jwt-auth.guard";
import { PermissionsGuard } from "@/common/guards/permissions.guard";

import { ContentTypeResponseDto, ContentTypeSummaryResponseDto } from "./dto/content-type-response.dto";

// Read-only by design — content-type structure is edited only by changing a content-types/*.json
// file and rebooting (the sync engine reconciles it), never via a write route.
@ApiTags("content-types")
@ApiCookieAuth()
@Controller("/api/content-types")
export class ContentTypeController {
  constructor(
    private readonly listContentTypeService: ListContentTypeService,
    private readonly getContentTypeService: GetContentTypeService,
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
    try {
      assertSafeSlug(slug);
    } catch (error) {
      if (error instanceof UnsafeSqlIdentifierError) {
        throw new BadRequestException(error.message);
      }
      throw error;
    }

    return this.getContentTypeService.execute(slug);
  }
}
