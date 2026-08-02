import { ContentTypeEntity } from "../../../content-type/domain/entities/content-type.entity";
import { FieldDefinition, isComponentField } from "../../../content-type/domain/entities/field-definition";
import { DocumentEntity } from "../../domain/entities/document.entity";
import { DOCUMENT_REPOSITORY, type IDocumentRepository } from "../../domain/repositories/document.repository";
import { ComponentIoService } from "../support/component-io.service";
import { assertKind, resolveSaveVersion } from "../support/draft-publish.policy";
import { SchemaResolverService } from "../support/schema-resolver.service";
import { randomUUID } from "node:crypto";

import { Inject, Injectable } from "@nestjs/common";

import { PrismaService } from "@/prisma/application/prisma.service";

function withScalarDefaults(data: Record<string, unknown>, fields: FieldDefinition[]): Record<string, unknown> {
  const result = { ...data };
  for (const field of fields) {
    if (!isComponentField(field)) result[field.name] = data[field.name] ?? null;
  }
  return result;
}

@Injectable()
export class SaveDocumentService {
  constructor(
    private readonly schemaResolver: SchemaResolverService,
    @Inject(DOCUMENT_REPOSITORY) private readonly documents: IDocumentRepository,
    private readonly componentIo: ComponentIoService,
    private readonly prisma: PrismaService,
  ) {}

  async execute(slug: string, data: Record<string, unknown>, documentId: string | undefined, userId: string | null, contentType?: ContentTypeEntity): Promise<DocumentEntity> {
    const resolvedContentType = contentType ?? (await this.schemaResolver.resolve(slug));
    assertKind(resolvedContentType, "collection");
    const version = resolveSaveVersion(resolvedContentType);
    const id = documentId ?? randomUUID();

    const existing = documentId ? await this.documents.findByVersion(slug, documentId, version, resolvedContentType.fields) : null;
    const now = new Date();
    const isPublishedVersion = version === "published";
    const normalizedData = withScalarDefaults(data, resolvedContentType.fields);

    const doc = new DocumentEntity(
      id,
      version,
      normalizedData,
      existing?.createdAt ?? now,
      now,
      isPublishedVersion ? now : null,
      existing?.createdBy ?? userId,
      userId,
      isPublishedVersion ? userId : null,
    );

    await this.prisma.$transaction(async (tx) => {
      await this.documents.upsert(slug, doc, resolvedContentType.fields, tx);
      await this.componentIo.saveComponents(slug, id, version, resolvedContentType.fields, normalizedData, tx);
    });

    return doc;
  }
}
