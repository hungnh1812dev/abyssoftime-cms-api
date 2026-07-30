import { ContentTypeEntity, ContentTypeSummary } from "../../domain/entities/content-type.entity";
import { ContentKind, FieldDefinition } from "../../domain/entities/field-definition";
import { ContentTypeNotFoundError, IContentTypeRepository, UpsertContentTypeData } from "../../domain/repositories/content-type.repository";

import { Injectable } from "@nestjs/common";

import { Prisma } from "@/prisma/application/client";
import { PrismaService } from "@/prisma/application/prisma.service";

@Injectable()
export class PrismaContentTypeRepository implements IContentTypeRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: UpsertContentTypeData): Promise<ContentTypeEntity> {
    const record = await this.prisma.contentType.create({
      data: {
        slug: data.slug,
        name: data.name,
        kind: data.kind,
        draftToPublish: data.draftToPublish,
        fields: data.fields as unknown as Prisma.InputJsonValue,
        listFields: data.listFields,
      },
    });
    return this.toEntity(record);
  }

  async update(slug: string, data: UpsertContentTypeData): Promise<ContentTypeEntity> {
    try {
      const record = await this.prisma.contentType.update({
        where: { slug },
        data: {
          name: data.name,
          kind: data.kind,
          draftToPublish: data.draftToPublish,
          fields: data.fields as unknown as Prisma.InputJsonValue,
          listFields: data.listFields,
        },
      });
      return this.toEntity(record);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
        throw new ContentTypeNotFoundError(slug);
      }
      throw error;
    }
  }

  async updateListFields(slug: string, listFields: string[]): Promise<ContentTypeEntity> {
    try {
      const record = await this.prisma.contentType.update({
        where: { slug },
        data: { listFieldsOverride: listFields },
      });
      return this.toEntity(record);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
        throw new ContentTypeNotFoundError(slug);
      }
      throw error;
    }
  }

  async delete(slug: string): Promise<void> {
    try {
      await this.prisma.contentType.delete({ where: { slug } });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
        throw new ContentTypeNotFoundError(slug);
      }
      throw error;
    }
  }

  async findBySlug(slug: string): Promise<ContentTypeEntity | null> {
    const record = await this.prisma.contentType.findUnique({ where: { slug } });
    return record ? this.toEntity(record) : null;
  }

  async findAll(): Promise<ContentTypeEntity[]> {
    const records = await this.prisma.contentType.findMany();
    return records.map((record) => this.toEntity(record));
  }

  async findAllSummaries(): Promise<ContentTypeSummary[]> {
    const records = await this.prisma.contentType.findMany({
      select: { name: true, slug: true, kind: true, draftToPublish: true },
    });
    return records.map((record) => ({
      name: record.name,
      slug: record.slug,
      kind: record.kind as ContentKind,
      draftToPublish: record.draftToPublish,
    }));
  }

  private toEntity(record: {
    documentId: string;
    slug: string;
    name: string;
    kind: string;
    draftToPublish: boolean;
    fields: unknown;
    listFields: unknown;
    listFieldsOverride?: unknown;
    createdAt: Date;
    updatedAt: Date;
  }): ContentTypeEntity {
    return new ContentTypeEntity(
      record.documentId,
      record.slug,
      record.name,
      record.kind as ContentKind,
      record.draftToPublish,
      record.fields as FieldDefinition[],
      (record.listFieldsOverride ?? record.listFields) as string[],
      record.createdAt,
      record.updatedAt,
    );
  }
}
