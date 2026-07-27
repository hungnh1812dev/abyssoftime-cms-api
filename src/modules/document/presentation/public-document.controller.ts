import { GetPublicDocumentService } from "../application/services/get-public-document.service";
import { GetPublicSingleTypeService } from "../application/services/get-public-single-type.service";

import { Controller, Get, Param } from "@nestjs/common";
import { ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";

import { type DocumentResponse, toDocumentResponse } from "./document-response.mapper";
import { DocumentResponseDto } from "./dto/document-response.dto";
import { validateDocumentIdParam, validateSlugParam } from "./validate-params";

// No guards anywhere — always resolves the published version only, regardless of draftToPublish
// mode; draft data is never reachable through these routes.
@ApiTags("documents-public")
@Controller("/api/public/documents")
export class PublicDocumentController {
  constructor(
    private readonly getPublicDocument: GetPublicDocumentService,
    private readonly getPublicSingleType: GetPublicSingleTypeService,
  ) {}

  @Get("collection-type/:slug/:documentId")
  @ApiOperation({ summary: "Get the published version of a collection-type document" })
  @ApiResponse({ status: 200, type: DocumentResponseDto })
  @ApiResponse({ status: 404, description: "No published document with that ID" })
  async getCollectionType(@Param("slug") slug: string, @Param("documentId") documentId: string): Promise<DocumentResponse> {
    validateSlugParam(slug);
    validateDocumentIdParam(documentId);

    const document = await this.getPublicDocument.execute(slug, documentId);
    return toDocumentResponse(document, "published");
  }

  @Get("single-type/:slug")
  @ApiOperation({ summary: "Get the published version of a single-type document" })
  @ApiResponse({ status: 200, type: DocumentResponseDto })
  @ApiResponse({ status: 404, description: "No published document exists yet" })
  async getSingleType(@Param("slug") slug: string): Promise<DocumentResponse> {
    validateSlugParam(slug);

    const document = await this.getPublicSingleType.execute(slug);
    return toDocumentResponse(document, "published");
  }
}
