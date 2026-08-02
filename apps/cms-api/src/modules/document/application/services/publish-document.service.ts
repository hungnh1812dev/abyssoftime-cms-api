import { ContentTypeEntity } from "../../../content-type/domain/entities/content-type.entity";
import { DocumentEntity } from "../../domain/entities/document.entity";
import { DOCUMENT_REPOSITORY, type IDocumentRepository } from "../../domain/repositories/document.repository";
import { ComponentIoService } from "../support/component-io.service";
import { assertDraftPublishEnabled, assertKind } from "../support/draft-publish.policy";
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

  async execute(
    slug: string,
    documentId: string,
    userId: string | null,
    contentType?: ContentTypeEntity,
    draftOverride?: DocumentEntity,
    isNewDocument = false,
  ): Promise<DocumentEntity> {
    const resolvedContentType = contentType ?? (await this.schemaResolver.resolve(slug));
    assertKind(resolvedContentType, "collection");
    assertDraftPublishEnabled(resolvedContentType);

    const draft = draftOverride ?? (await this.documents.findByVersion(slug, documentId, "draft", resolvedContentType.fields));
    if (!draft) {
      throw new NotFoundException(`Document "${documentId}" not found`);
    }

    const existingPublished = isNewDocument ? null : await this.documents.findByVersion(slug, documentId, "published", resolvedContentType.fields);
    const draftComponents = await this.componentIo.hydrateComponents(slug, documentId, "draft", resolvedContentType.fields);
    const fields = { ...draft.fields, ...draftComponents };

    const now = new Date();
    const published = new DocumentEntity(documentId, "published", fields, existingPublished?.createdAt ?? now, now, now, draft.createdBy, draft.updatedBy, userId);

    await this.prisma.$transaction(async (tx) => {
      await this.documents.upsert(slug, published, resolvedContentType.fields, tx);
      await this.componentIo.saveComponents(slug, documentId, "published", resolvedContentType.fields, fields, tx);
    });

    return published;
  }
}
