import { DOCUMENT_REPOSITORY, type IDocumentRepository } from "../../domain/repositories/document.repository";
import { ComponentIoService } from "../support/component-io.service";
import { assertDraftPublishEnabled } from "../support/draft-publish.policy";
import { SchemaResolverService } from "../support/schema-resolver.service";

import { Inject, Injectable, NotFoundException } from "@nestjs/common";

import { PrismaService } from "@/prisma/application/prisma.service";

@Injectable()
export class UnpublishSingleTypeService {
  constructor(
    private readonly schemaResolver: SchemaResolverService,
    @Inject(DOCUMENT_REPOSITORY) private readonly documents: IDocumentRepository,
    private readonly componentIo: ComponentIoService,
    private readonly prisma: PrismaService,
  ) {}

  async execute(slug: string): Promise<void> {
    const contentType = await this.schemaResolver.resolve(slug);
    assertDraftPublishEnabled(contentType);

    const published = await this.documents.findSingle(slug, "published", contentType.fields);
    if (!published) {
      throw new NotFoundException(`Document for "${slug}" not found`);
    }

    await this.prisma.$transaction(async (tx) => {
      await this.componentIo.deleteComponents(slug, published.documentId, "published", contentType.fields, tx);
      await this.documents.deleteVersion(slug, published.documentId, "published", tx);
    });
  }
}
