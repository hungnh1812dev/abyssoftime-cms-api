import { ContentTypeEntity } from "../../../content-type/domain/entities/content-type.entity";
import { DocumentEntity } from "../../domain/entities/document.entity";
import { IDocumentRepository } from "../../domain/repositories/document.repository";
import { ComponentIoService } from "../support/component-io.service";
import { SchemaResolverService } from "../support/schema-resolver.service";

import { NotFoundException } from "@nestjs/common";

import { FieldDefinition } from "@/modules/content-type/domain/entities/field-definition";
import { PrismaService } from "@/prisma/application/prisma.service";

import { DuplicateDocumentService } from "./duplicate-document.service";

describe("DuplicateDocumentService", () => {
  const FIELDS: FieldDefinition[] = [
    { name: "position", type: "text" },
    { name: "avatar", type: "media" },
  ];
  const TX = { fake: "tx" };

  function buildContentType(draftToPublish: boolean): ContentTypeEntity {
    return new ContentTypeEntity("ct-1", "cv-page", "CV Page", "collection", draftToPublish, FIELDS, ["position"], new Date(), new Date());
  }

  function buildDeps(contentType: ContentTypeEntity) {
    const schemaResolver = { resolve: jest.fn().mockResolvedValue(contentType) } as unknown as jest.Mocked<SchemaResolverService>;
    const documents: jest.Mocked<IDocumentRepository> = {
      findByVersion: jest.fn().mockResolvedValue(null),
      upsert: jest.fn().mockResolvedValue(undefined),
      deleteAllVersions: jest.fn(),
      deleteVersion: jest.fn(),
      listPaginated: jest.fn(),
      findManyByVersion: jest.fn(),
      findSingle: jest.fn(),
    };
    const componentIo = {
      saveComponents: jest.fn().mockResolvedValue(undefined),
      hydrateComponents: jest.fn().mockResolvedValue({}),
      deleteComponents: jest.fn(),
    } as unknown as jest.Mocked<ComponentIoService>;
    const prisma = { $transaction: jest.fn((callback: (tx: unknown) => Promise<void>) => callback(TX)) } as unknown as jest.Mocked<PrismaService>;

    return { schemaResolver, documents, componentIo, prisma };
  }

  it("throws NotFoundException when the source draft does not exist (mode A)", async () => {
    const contentType = buildContentType(true);
    const { schemaResolver, documents, componentIo, prisma } = buildDeps(contentType);
    const service = new DuplicateDocumentService(schemaResolver, documents, componentIo, prisma);

    await expect(service.execute("cv-page", "doc-1", "user-1")).rejects.toThrow(NotFoundException);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it("copies the source draft + hydrated components into a fresh draft row, sharing media UUID refs (mode A)", async () => {
    const contentType = buildContentType(true);
    const { schemaResolver, documents, componentIo, prisma } = buildDeps(contentType);
    const source = new DocumentEntity(
      "doc-1",
      "draft",
      { position: "Engineer", avatar: "media-uuid-1" },
      new Date("2026-01-01"),
      new Date("2026-01-01"),
      null,
      "user-0",
      "user-0",
      null,
    );
    documents.findByVersion.mockResolvedValue(source);
    componentIo.hydrateComponents.mockResolvedValue({ skills: [{ componentId: "skill-1", level: "expert" }] });

    const service = new DuplicateDocumentService(schemaResolver, documents, componentIo, prisma);
    const duplicate = await service.execute("cv-page", "doc-1", "user-1");

    expect(duplicate.documentId).not.toBe("doc-1");
    expect(duplicate.documentId.length).toBeGreaterThan(0);
    expect(duplicate.version).toBe("draft");
    expect(duplicate.fields).toEqual({ position: "Engineer", avatar: "media-uuid-1", skills: [{ componentId: "skill-1", level: "expert" }] });
    expect(duplicate.createdAt).toEqual(duplicate.updatedAt);
    expect(duplicate.publishedAt).toBeNull();
    expect(duplicate.createdBy).toBe("user-1");
    expect(duplicate.updatedBy).toBe("user-1");

    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(documents.upsert).toHaveBeenCalledWith("cv-page", duplicate, contentType.fields, TX);
    expect(componentIo.saveComponents).toHaveBeenCalledWith("cv-page", duplicate.documentId, "draft", contentType.fields, duplicate.fields, TX);
  });

  it("copies the single live row into a fresh published row, stamping publishedAt/publishedBy (mode B)", async () => {
    const contentType = buildContentType(false);
    const { schemaResolver, documents, componentIo, prisma } = buildDeps(contentType);
    const source = new DocumentEntity(
      "doc-1",
      "published",
      { position: "Engineer" },
      new Date("2026-01-01"),
      new Date("2026-01-01"),
      new Date("2026-01-01"),
      "user-0",
      "user-0",
      "user-0",
    );
    documents.findByVersion.mockResolvedValue(source);

    const service = new DuplicateDocumentService(schemaResolver, documents, componentIo, prisma);
    const duplicate = await service.execute("cv-page", "doc-1", "user-1");

    expect(duplicate.documentId).not.toBe("doc-1");
    expect(duplicate.version).toBe("published");
    expect(duplicate.publishedAt).toEqual(duplicate.updatedAt);
    expect(duplicate.publishedBy).toBe("user-1");
    expect(documents.findByVersion).toHaveBeenCalledWith("cv-page", "doc-1", "published", contentType.fields);
  });
});
