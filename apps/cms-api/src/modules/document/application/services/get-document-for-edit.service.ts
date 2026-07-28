import { DocumentEntity, DocumentStatus } from "../../domain/entities/document.entity";
import { DOCUMENT_REPOSITORY, type IDocumentRepository } from "../../domain/repositories/document.repository";
import { ComponentIoService } from "../support/component-io.service";
import { assertKind, resolveSaveVersion } from "../support/draft-publish.policy";
import { SchemaResolverService } from "../support/schema-resolver.service";
import { resolveStatus } from "../support/status-resolver";

import { Inject, Injectable, NotFoundException } from "@nestjs/common";

export interface DocumentForEdit {
  document: DocumentEntity;
  status: DocumentStatus;
}

@Injectable()
export class GetDocumentForEditService {
  constructor(
    private readonly schemaResolver: SchemaResolverService,
    @Inject(DOCUMENT_REPOSITORY) private readonly documents: IDocumentRepository,
    private readonly componentIo: ComponentIoService,
  ) {}

  async execute(slug: string, documentId: string): Promise<DocumentForEdit> {
    const contentType = await this.schemaResolver.resolve(slug);
    assertKind(contentType, "collection");
    const version = resolveSaveVersion(contentType);

    const row = await this.documents.findByVersion(slug, documentId, version, contentType.fields);
    if (!row) {
      throw new NotFoundException(`Document "${documentId}" not found`);
    }

    const components = await this.componentIo.hydrateComponents(slug, documentId, version, contentType.fields);
    const document = new DocumentEntity(
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

    let publishedUpdatedAt: Date | null = null;
    if (contentType.draftToPublish) {
      const published = await this.documents.findByVersion(slug, documentId, "published", contentType.fields);
      publishedUpdatedAt = published?.updatedAt ?? null;
    }

    const status = resolveStatus(contentType.draftToPublish, row.updatedAt, publishedUpdatedAt);

    return { document, status };
  }
}
