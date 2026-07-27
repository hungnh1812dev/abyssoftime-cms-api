import { DocumentEntity } from "../../domain/entities/document.entity";
import { DOCUMENT_REPOSITORY, type IDocumentRepository } from "../../domain/repositories/document.repository";
import { ComponentIoService } from "../support/component-io.service";
import { SchemaResolverService } from "../support/schema-resolver.service";

import { Inject, Injectable, NotFoundException } from "@nestjs/common";

@Injectable()
export class GetPublicDocumentService {
  constructor(
    private readonly schemaResolver: SchemaResolverService,
    @Inject(DOCUMENT_REPOSITORY) private readonly documents: IDocumentRepository,
    private readonly componentIo: ComponentIoService,
  ) {}

  async execute(slug: string, documentId: string): Promise<DocumentEntity> {
    const contentType = await this.schemaResolver.resolve(slug);

    const row = await this.documents.findByVersion(slug, documentId, "published", contentType.fields);
    if (!row) {
      throw new NotFoundException(`Document "${documentId}" not found`);
    }

    const components = await this.componentIo.hydrateComponents(slug, documentId, "published", contentType.fields);
    return new DocumentEntity(
      row.documentId,
      row.version,
      { ...row.fields, ...components },
      row.createdAt,
      row.updatedAt,
      row.publishedAt,
      row.createdBy,
      row.updatedBy,
      row.publishedBy,
    );
  }
}
