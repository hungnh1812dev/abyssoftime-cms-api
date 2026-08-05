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

import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Inject, Param, Post, Put, Query, Req, UseGuards } from "@nestjs/common";
import { ApiCookieAuth, ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";

import { RequirePermissions } from "@/common/decorators/require-permissions.decorator";
import { JwtAuthGuard } from "@/common/guards/jwt-auth.guard";
import { PermissionsGuard } from "@/common/guards/permissions.guard";
import { type AuthenticatedRequest } from "@/common/types/authenticated-request";
import { type IUserRepository, USER_REPOSITORY } from "@/modules/users/domain/repositories/user.repository";

import { type DocumentResponse, type ResolvedUpdatedBy, toDocumentResponse } from "./document-response.mapper";
import { BulkCreateDto } from "./dto/bulk-create.dto";
import { BulkDeleteDto } from "./dto/bulk-delete.dto";
import { BulkCreateResponseDto, BulkDeleteResponseDto, DocumentResponseDto, ListDocumentsResponseDto, PublishStatusResponseDto } from "./dto/document-response.dto";
import { ListQueryDto } from "./dto/list-query.dto";
import { SaveDocumentDto } from "./dto/save-document.dto";
import { validateDocumentIdParam, validateSlugParam } from "./validate-params";

interface BulkCreateResponse {
  items: DocumentResponse[];
}

interface BulkDeleteResponse {
  deleted: string[];
}

@ApiTags("documents-collection-type")
@ApiCookieAuth()
@Controller("documents/collection-type")
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
    @Inject(USER_REPOSITORY) private readonly users: IUserRepository,
  ) {}

  @Get(":slug")
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions("document:read")
  @ApiOperation({ summary: "List documents, paginated/sorted/searched" })
  @ApiResponse({ status: 200, type: ListDocumentsResponseDto })
  async list(@Param("slug") slug: string, @Query() query: ListQueryDto): Promise<ListDocumentsResult> {
    validateSlugParam(slug);

    return this.listDocuments.execute(slug, query);
  }

  // Route-ordering: both /bulk routes must be declared before any /:documentId route,
  // or Nest captures "bulk" as :documentId (SPEC §10.3).
  @Post(":slug/bulk")
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions("document:create", "document:publish")
  @ApiOperation({
    summary:
      "Bulk create + publish, processed in concurrent chunks of 5; any failure rolls back every item created so far (not strictly request-ordered within the failing chunk), and the current item too if it failed at the publish step",
  })
  @ApiResponse({ status: 201, type: BulkCreateResponseDto })
  async bulkCreate(@Param("slug") slug: string, @Body() dto: BulkCreateDto, @Req() req: AuthenticatedRequest): Promise<BulkCreateResponse> {
    validateSlugParam(slug);

    const documents = await this.bulkCreateAndPublishService.execute(
      slug,
      dto.items.map((item) => item.data),
      req.user.sub,
    );
    // Every document in the batch is stamped with the same caller id, so one lookup covers the whole page.
    const updatedBy = await this.resolveUpdatedBy(req.user.sub);
    const items = documents.map((document) => toDocumentResponse(document, "published", updatedBy));
    return { items };
  }

  @Delete(":slug/bulk")
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions("document:delete")
  @ApiOperation({ summary: "Bulk delete — all-or-nothing, one ID's failure rolls back the whole batch" })
  @ApiResponse({ status: 200, type: BulkDeleteResponseDto })
  async bulkDelete(@Param("slug") slug: string, @Body() dto: BulkDeleteDto): Promise<BulkDeleteResponse> {
    validateSlugParam(slug);

    const deleted = await this.bulkDeleteService.execute(slug, dto.documentIds);
    return { deleted };
  }

  @Post(":slug")
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions("document:create")
  @ApiOperation({ summary: "Create a document" })
  @ApiResponse({ status: 201, type: DocumentResponseDto })
  async create(@Param("slug") slug: string, @Body() dto: SaveDocumentDto, @Req() req: AuthenticatedRequest): Promise<DocumentResponse> {
    validateSlugParam(slug);

    const document = await this.saveDocument.execute(slug, dto.data, undefined, req.user.sub);
    const updatedBy = await this.resolveUpdatedBy(document.updatedBy);
    return toDocumentResponse(document, statusOfFreshDocument(document), updatedBy);
  }

  @Get(":slug/:documentId")
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions("document:read")
  @ApiOperation({ summary: "Get a document by ID (draft in Mode A, published in Mode B)" })
  @ApiResponse({ status: 200, type: DocumentResponseDto })
  @ApiResponse({ status: 404, description: "Document not found" })
  async get(@Param("slug") slug: string, @Param("documentId") documentId: string): Promise<DocumentResponse> {
    validateSlugParam(slug);
    validateDocumentIdParam(documentId);

    const { document, status } = await this.getDocumentForEdit.execute(slug, documentId);
    const updatedBy = await this.resolveUpdatedBy(document.updatedBy);
    return toDocumentResponse(document, status, updatedBy);
  }

  @Put(":slug/:documentId")
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions("document:update")
  @ApiOperation({ summary: "Update a document" })
  @ApiResponse({ status: 200, type: DocumentResponseDto })
  async update(@Param("slug") slug: string, @Param("documentId") documentId: string, @Body() dto: SaveDocumentDto, @Req() req: AuthenticatedRequest): Promise<DocumentResponse> {
    validateSlugParam(slug);
    validateDocumentIdParam(documentId);

    await this.saveDocument.execute(slug, dto.data, documentId, req.user.sub);
    const { document, status } = await this.getDocumentForEdit.execute(slug, documentId);
    const updatedBy = await this.resolveUpdatedBy(document.updatedBy);
    return toDocumentResponse(document, status, updatedBy);
  }

  @Delete(":slug/:documentId")
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions("document:delete")
  @ApiOperation({ summary: "Delete a document (both draft and published versions, plus their components)" })
  @ApiResponse({ status: 204, description: "Deleted" })
  @ApiResponse({ status: 404, description: "Document not found" })
  async delete(@Param("slug") slug: string, @Param("documentId") documentId: string): Promise<void> {
    validateSlugParam(slug);
    validateDocumentIdParam(documentId);

    await this.deleteDocument.execute(slug, documentId);
  }

  @Post(":slug/:documentId/publish")
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions("document:publish")
  @ApiOperation({ summary: "Publish the draft (Mode A only)" })
  @ApiResponse({ status: 200, type: PublishStatusResponseDto })
  @ApiResponse({ status: 400, description: "Content type has draftToPublish disabled (Mode B)" })
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
  @ApiOperation({ summary: "Unpublish (Mode A only) — draft is left untouched" })
  @ApiResponse({ status: 200, type: PublishStatusResponseDto })
  @ApiResponse({ status: 400, description: "Content type has draftToPublish disabled (Mode B)" })
  async unpublish(@Param("slug") slug: string, @Param("documentId") documentId: string): Promise<{ status: "draft" }> {
    validateSlugParam(slug);
    validateDocumentIdParam(documentId);

    await this.unpublishDocument.execute(slug, documentId);
    return { status: "draft" };
  }

  @Post(":slug/:documentId/duplicate")
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions("document:create")
  @ApiOperation({ summary: "Duplicate a document as a brand-new document (shares the same underlying media assets)" })
  @ApiResponse({ status: 201, type: DocumentResponseDto })
  @ApiResponse({ status: 404, description: "Source document not found" })
  async duplicate(@Param("slug") slug: string, @Param("documentId") documentId: string, @Req() req: AuthenticatedRequest): Promise<DocumentResponse> {
    validateSlugParam(slug);
    validateDocumentIdParam(documentId);

    const document = await this.duplicateDocument.execute(slug, documentId, req.user.sub);
    const updatedBy = await this.resolveUpdatedBy(document.updatedBy);
    return toDocumentResponse(document, statusOfFreshDocument(document), updatedBy);
  }

  private async resolveUpdatedBy(userId: string | null): Promise<ResolvedUpdatedBy | null> {
    if (!userId) {
      return null;
    }
    const user = await this.users.findById(userId);
    return user ? { documentId: user.documentId, name: user.name } : null;
  }
}

// Safe without a re-read: both `create` (documentId always freshly generated) and `duplicate`
// (always a brand-new documentId) can never already have a published counterpart, so
// resolveStatus's draft-vs-modified branch can never apply — the version alone is enough.
function statusOfFreshDocument(document: DocumentEntity): DocumentStatus {
  return document.version === "published" ? "published" : "draft";
}
