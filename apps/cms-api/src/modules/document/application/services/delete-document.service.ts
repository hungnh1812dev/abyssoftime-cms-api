import { DOCUMENT_REPOSITORY, type IDocumentRepository } from "../../domain/repositories/document.repository";
import { ComponentIoService } from "../support/component-io.service";
import { assertKind } from "../support/draft-publish.policy";
import { SchemaResolverService } from "../support/schema-resolver.service";

import { Inject, Injectable, NotFoundException } from "@nestjs/common";

import { PrismaService } from "@/prisma/application/prisma.service";

@Injectable()
export class DeleteDocumentService {
  constructor(
    private readonly schemaResolver: SchemaResolverService,
    @Inject(DOCUMENT_REPOSITORY) private readonly documents: IDocumentRepository,
    private readonly componentIo: ComponentIoService,
    private readonly prisma: PrismaService,
  ) {}

  async execute(slug: string, documentId: string): Promise<void> {
    const contentType = await this.schemaResolver.resolve(slug);
    assertKind(contentType, "collection");

    const [draft, published] = await Promise.all([
      this.documents.findByVersion(slug, documentId, "draft", contentType.fields),
      this.documents.findByVersion(slug, documentId, "published", contentType.fields),
    ]);
    if (!draft && !published) {
      throw new NotFoundException(`Document "${documentId}" not found`);
    }

    await this.prisma.$transaction(async (tx) => {
      await this.componentIo.deleteComponents(slug, documentId, "draft", contentType.fields, tx);
      await this.componentIo.deleteComponents(slug, documentId, "published", contentType.fields, tx);
      await this.documents.deleteAllVersions(slug, documentId, tx);
    });
  }
}
