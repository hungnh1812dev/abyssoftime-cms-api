import { assertSafeSlug, UnsafeSqlIdentifierError } from "../application/schema/sql-identifier";
import { GetContentTypeService } from "../application/services/get-content-type.service";
import { ListContentTypeService } from "../application/services/list-content-type.service";
import { ContentTypeEntity, ContentTypeSummary } from "../domain/entities/content-type.entity";

import { BadRequestException, Controller, Get, Param, UseGuards } from "@nestjs/common";

import { RequirePermissions } from "@/common/decorators/require-permissions.decorator";
import { JwtAuthGuard } from "@/common/guards/jwt-auth.guard";
import { PermissionsGuard } from "@/common/guards/permissions.guard";

@Controller("/api/content-types")
export class ContentTypeController {
  constructor(
    private readonly listContentTypeService: ListContentTypeService,
    private readonly getContentTypeService: GetContentTypeService,
  ) {}

  @Get()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions("content_type:read")
  async list(): Promise<ContentTypeSummary[]> {
    return this.listContentTypeService.execute();
  }

  @Get(":slug")
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions("content_type:read")
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
