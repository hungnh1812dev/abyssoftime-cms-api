import { DocumentEntity } from "../../domain/entities/document.entity";
import { DOCUMENT_REPOSITORY, type IDocumentRepository } from "../../domain/repositories/document.repository";
import { ComponentIoService } from "../support/component-io.service";
import { resolveSaveVersion } from "../support/draft-publish.policy";
import { SchemaResolverService } from "../support/schema-resolver.service";
import { randomUUID } from "node:crypto";

import { Inject, Injectable } from "@nestjs/common";

import { PrismaService } from "@/prisma/application/prisma.service";

@Injectable()
export class SaveSingleTypeService {
  constructor(
    private readonly schemaResolver: SchemaResolverService,
    @Inject(DOCUMENT_REPOSITORY) private readonly documents: IDocumentRepository,
    private readonly componentIo: ComponentIoService,
    private readonly prisma: PrismaService,
  ) {}

  async execute(slug: string, data: Record<string, unknown>, userId: string | null): Promise<DocumentEntity> {
    const contentType = await this.schemaResolver.resolve(slug);
    const version = resolveSaveVersion(contentType);

    const existing = await this.documents.findSingle(slug, version, contentType.fields);
    const id = existing?.documentId ?? randomUUID();
    const now = new Date();
    const isPublishedVersion = version === "published";

    const doc = new DocumentEntity(
      id,
      version,
      data,
      existing?.createdAt ?? now,
      now,
      isPublishedVersion ? now : null,
      existing?.createdBy ?? userId,
      userId,
      isPublishedVersion ? userId : null,
    );

    await this.prisma.$transaction(async (tx) => {
      await this.documents.upsert(slug, doc, contentType.fields, tx);
      await this.componentIo.saveComponents(slug, id, version, contentType.fields, data, tx);
    });

    return doc;
  }
}
