import { DocumentEntity } from "../../domain/entities/document.entity";
import { DOCUMENT_REPOSITORY, type IDocumentRepository } from "../../domain/repositories/document.repository";
import { ComponentIoService } from "../support/component-io.service";
import { assertDraftPublishEnabled } from "../support/draft-publish.policy";
import { SchemaResolverService } from "../support/schema-resolver.service";

import { Inject, Injectable, NotFoundException } from "@nestjs/common";

import { PrismaService } from "@/prisma/application/prisma.service";

@Injectable()
export class PublishDocumentService {
  constructor(
    private readonly schemaResolver: SchemaResolverService,
    @Inject(DOCUMENT_REPOSITORY) private readonly documents: IDocumentRepository,
    private readonly componentIo: ComponentIoService,
    private readonly prisma: PrismaService,
  ) {}

  async execute(slug: string, documentId: string, userId: string | null): Promise<DocumentEntity> {
    const contentType = await this.schemaResolver.resolve(slug);
    assertDraftPublishEnabled(contentType);

    const draft = await this.documents.findByVersion(slug, documentId, "draft", contentType.fields);
    if (!draft) {
      throw new NotFoundException(`Document "${documentId}" not found`);
    }

    const existingPublished = await this.documents.findByVersion(slug, documentId, "published", contentType.fields);
    const draftComponents = await this.componentIo.hydrateComponents(slug, documentId, "draft", contentType.fields);
    const fields = { ...draft.fields, ...draftComponents };

    const now = new Date();
    const published = new DocumentEntity(documentId, "published", fields, existingPublished?.createdAt ?? now, now, now, draft.createdBy, draft.updatedBy, userId);

    await this.prisma.$transaction(async (tx) => {
      await this.documents.upsert(slug, published, contentType.fields, tx);
      await this.componentIo.saveComponents(slug, documentId, "published", contentType.fields, fields, tx);
    });

    return published;
  }
}
