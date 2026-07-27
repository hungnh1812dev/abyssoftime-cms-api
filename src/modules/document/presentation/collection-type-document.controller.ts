import { BulkCreateAndPublishService } from "../application/services/bulk-create-publish.service";
import { BulkDeleteService } from "../application/services/bulk-delete.service";
import { DeleteDocumentService } from "../application/services/delete-document.service";
import { DuplicateDocumentService } from "../application/services/duplicate-document.service";
import { GetDocumentForEditService } from "../application/services/get-document-for-edit.service";
import { type ListDocumentsResult, ListDocumentsService } from "../application/services/list-documents.service";
import { PublishDocumentService } from "../application/services/publish-document.service";
import { SaveDocumentService } from "../application/services/save-document.service";
import { UnpublishDocumentService } from "../application/services/unpublish-document.service";
import { DocumentEntity, DocumentStatus } from "../domain/entities/document.entity";

import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Post, Put, Query, Req, UseGuards } from "@nestjs/common";

import { RequirePermissions } from "@/common/decorators/require-permissions.decorator";
import { JwtAuthGuard } from "@/common/guards/jwt-auth.guard";
import { PermissionsGuard } from "@/common/guards/permissions.guard";
import { type AuthenticatedRequest } from "@/common/types/authenticated-request";

import { type DocumentResponse, toDocumentResponse } from "./document-response.mapper";
import { BulkCreateDto } from "./dto/bulk-create.dto";
import { BulkDeleteDto } from "./dto/bulk-delete.dto";
import { ListQueryDto } from "./dto/list-query.dto";
import { SaveDocumentDto } from "./dto/save-document.dto";
import { validateDocumentIdParam, validateSlugParam } from "./validate-params";

interface BulkCreateResponse {
  items: DocumentResponse[];
}

interface BulkDeleteResponse {
  deleted: string[];
  failed: { documentId: string; error?: string }[];
}

@Controller("/api/documents/collection-type")
export class CollectionTypeDocumentController {
  constructor(
    private readonly listDocuments: ListDocumentsService,
    private readonly saveDocument: SaveDocumentService,
    private readonly publishDocument: PublishDocumentService,
    private readonly unpublishDocument: UnpublishDocumentService,
    private readonly getDocumentForEdit: GetDocumentForEditService,
    private readonly deleteDocument: DeleteDocumentService,
    private readonly duplicateDocument: DuplicateDocumentService,
    private readonly bulkCreateAndPublishService: BulkCreateAndPublishService,
    private readonly bulkDeleteService: BulkDeleteService,
  ) {}

  @Get(":slug")
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions("document:read")
  async list(@Param("slug") slug: string, @Query() query: ListQueryDto): Promise<ListDocumentsResult> {
    validateSlugParam(slug);

    return this.listDocuments.execute(slug, query);
  }

  // Route-ordering: both /bulk routes must be declared before any /:documentId route,
  // or Nest captures "bulk" as :documentId (SPEC §10.3).
  @Post(":slug/bulk")
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions("document:create", "document:publish")
  async bulkCreate(@Param("slug") slug: string, @Body() dto: BulkCreateDto, @Req() req: AuthenticatedRequest): Promise<BulkCreateResponse> {
    validateSlugParam(slug);

    const documents = await this.bulkCreateAndPublishService.execute(
      slug,
      dto.items.map((item) => item.data),
      req.user.sub,
    );
    return { items: documents.map((document) => toDocumentResponse(document, "published")) };
  }

  @Delete(":slug/bulk")
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions("document:delete")
  async bulkDelete(@Param("slug") slug: string, @Body() dto: BulkDeleteDto): Promise<BulkDeleteResponse> {
    validateSlugParam(slug);

    const results = await this.bulkDeleteService.execute(slug, dto.documentIds);
    return {
      deleted: results.filter((result) => !result.error).map((result) => result.documentId),
      failed: results.filter((result) => result.error),
    };
  }

  @Post(":slug")
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions("document:create")
  async create(@Param("slug") slug: string, @Body() dto: SaveDocumentDto, @Req() req: AuthenticatedRequest): Promise<DocumentResponse> {
    validateSlugParam(slug);

    const document = await this.saveDocument.execute(slug, dto.data, undefined, req.user.sub);
    return toDocumentResponse(document, statusOfFreshDocument(document));
  }

  @Get(":slug/:documentId")
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions("document:read")
  async get(@Param("slug") slug: string, @Param("documentId") documentId: string): Promise<DocumentResponse> {
    validateSlugParam(slug);
    validateDocumentIdParam(documentId);

    const { document, status } = await this.getDocumentForEdit.execute(slug, documentId);
    return toDocumentResponse(document, status);
  }

  @Put(":slug/:documentId")
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions("document:update")
  async update(@Param("slug") slug: string, @Param("documentId") documentId: string, @Body() dto: SaveDocumentDto, @Req() req: AuthenticatedRequest): Promise<DocumentResponse> {
    validateSlugParam(slug);
    validateDocumentIdParam(documentId);

    await this.saveDocument.execute(slug, dto.data, documentId, req.user.sub);
    const { document, status } = await this.getDocumentForEdit.execute(slug, documentId);
    return toDocumentResponse(document, status);
  }

  @Delete(":slug/:documentId")
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions("document:delete")
  async delete(@Param("slug") slug: string, @Param("documentId") documentId: string): Promise<void> {
    validateSlugParam(slug);
    validateDocumentIdParam(documentId);

    await this.deleteDocument.execute(slug, documentId);
  }

  @Post(":slug/:documentId/publish")
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions("document:publish")
  async publish(@Param("slug") slug: string, @Param("documentId") documentId: string, @Req() req: AuthenticatedRequest): Promise<{ status: "published" }> {
    validateSlugParam(slug);
    validateDocumentIdParam(documentId);

    await this.publishDocument.execute(slug, documentId, req.user.sub);
    return { status: "published" };
  }

  @Post(":slug/:documentId/unpublish")
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions("document:unpublish")
  async unpublish(@Param("slug") slug: string, @Param("documentId") documentId: string): Promise<{ status: "draft" }> {
    validateSlugParam(slug);
    validateDocumentIdParam(documentId);

    await this.unpublishDocument.execute(slug, documentId);
    return { status: "draft" };
  }

  @Post(":slug/:documentId/duplicate")
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions("document:create")
  async duplicate(@Param("slug") slug: string, @Param("documentId") documentId: string, @Req() req: AuthenticatedRequest): Promise<DocumentResponse> {
    validateSlugParam(slug);
    validateDocumentIdParam(documentId);

    const document = await this.duplicateDocument.execute(slug, documentId, req.user.sub);
    return toDocumentResponse(document, statusOfFreshDocument(document));
  }
}

// Safe without a re-read: both `create` (documentId always freshly generated) and `duplicate`
// (always a brand-new documentId) can never already have a published counterpart, so
// resolveStatus's draft-vs-modified branch can never apply — the version alone is enough.
function statusOfFreshDocument(document: DocumentEntity): DocumentStatus {
  return document.version === "published" ? "published" : "draft";
}
