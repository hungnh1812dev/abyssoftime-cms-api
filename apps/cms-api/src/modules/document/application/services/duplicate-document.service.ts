import { DocumentEntity } from "../../domain/entities/document.entity";
import { DOCUMENT_REPOSITORY, type IDocumentRepository } from "../../domain/repositories/document.repository";
import { ComponentIoService } from "../support/component-io.service";
import { assertKind, resolveSaveVersion } from "../support/draft-publish.policy";
import { SchemaResolverService } from "../support/schema-resolver.service";
import { randomUUID } from "node:crypto";

import { Inject, Injectable, NotFoundException } from "@nestjs/common";

import { PrismaService } from "@/prisma/application/prisma.service";

@Injectable()
export class DuplicateDocumentService {
  constructor(
    private readonly schemaResolver: SchemaResolverService,
    @Inject(DOCUMENT_REPOSITORY) private readonly documents: IDocumentRepository,
    private readonly componentIo: ComponentIoService,
    private readonly prisma: PrismaService,
  ) {}

  async execute(slug: string, sourceDocumentId: string, userId: string | null): Promise<DocumentEntity> {
    const contentType = await this.schemaResolver.resolve(slug);
    assertKind(contentType, "collection");
    const version = resolveSaveVersion(contentType);

    const source = await this.documents.findByVersion(slug, sourceDocumentId, version, contentType.fields);
    if (!source) {
      throw new NotFoundException(`Document "${sourceDocumentId}" not found`);
    }

    const sourceComponents = await this.componentIo.hydrateComponents(slug, sourceDocumentId, version, contentType.fields);
    const fields = { ...source.fields, ...sourceComponents };

    const newDocumentId = randomUUID();
    const now = new Date();
    const isPublishedVersion = version === "published";

    const duplicate = new DocumentEntity(newDocumentId, version, fields, now, now, isPublishedVersion ? now : null, userId, userId, isPublishedVersion ? userId : null);

    await this.prisma.$transaction(async (tx) => {
      await this.documents.upsert(slug, duplicate, contentType.fields, tx);
      await this.componentIo.saveComponents(slug, newDocumentId, version, contentType.fields, fields, tx);
    });

    return duplicate;
  }
}
