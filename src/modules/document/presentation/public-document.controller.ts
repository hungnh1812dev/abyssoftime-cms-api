import { GetPublicDocumentService } from "../application/services/get-public-document.service";
import { GetPublicSingleTypeService } from "../application/services/get-public-single-type.service";

import { Controller, Get, Param } from "@nestjs/common";

import { type DocumentResponse, toDocumentResponse } from "./document-response.mapper";
import { validateDocumentIdParam, validateSlugParam } from "./validate-params";

@Controller("/api/public/documents")
export class PublicDocumentController {
  constructor(
    private readonly getPublicDocument: GetPublicDocumentService,
    private readonly getPublicSingleType: GetPublicSingleTypeService,
  ) {}

  @Get("collection-type/:slug/:documentId")
  async getCollectionType(@Param("slug") slug: string, @Param("documentId") documentId: string): Promise<DocumentResponse> {
    validateSlugParam(slug);
    validateDocumentIdParam(documentId);

    const document = await this.getPublicDocument.execute(slug, documentId);
    return toDocumentResponse(document, "published");
  }

  @Get("single-type/:slug")
  async getSingleType(@Param("slug") slug: string): Promise<DocumentResponse> {
    validateSlugParam(slug);

    const document = await this.getPublicSingleType.execute(slug);
    return toDocumentResponse(document, "published");
  }
}
