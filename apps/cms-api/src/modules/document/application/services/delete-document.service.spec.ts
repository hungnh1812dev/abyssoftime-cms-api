import { ContentTypeEntity } from "../../../content-type/domain/entities/content-type.entity";
import { DocumentEntity } from "../../domain/entities/document.entity";
import { IDocumentRepository } from "../../domain/repositories/document.repository";
import { ComponentIoService } from "../support/component-io.service";
import { SchemaResolverService } from "../support/schema-resolver.service";

import { NotFoundException } from "@nestjs/common";

import { FieldDefinition } from "@/modules/content-type/domain/entities/field-definition";
import { PrismaService } from "@/prisma/application/prisma.service";

import { DeleteDocumentService } from "./delete-document.service";

describe("DeleteDocumentService", () => {
  const FIELDS: FieldDefinition[] = [{ name: "position", type: "text" }];
  const TX = { fake: "tx" };

  function buildContentType(draftToPublish: boolean): ContentTypeEntity {
    return new ContentTypeEntity("ct-1", "cv-page", "CV Page", "collection", draftToPublish, FIELDS, ["position"], new Date(), new Date());
  }

  function buildDeps(contentType: ContentTypeEntity) {
    const schemaResolver = { resolve: jest.fn().mockResolvedValue(contentType) } as unknown as jest.Mocked<SchemaResolverService>;
    const documents: jest.Mocked<IDocumentRepository> = {
      findByVersion: jest.fn().mockResolvedValue(null),
      upsert: jest.fn(),
      deleteAllVersions: jest.fn().mockResolvedValue(undefined),
      deleteVersion: jest.fn(),
      listPaginated: jest.fn(),
      findManyByVersion: jest.fn(),
      findSingle: jest.fn(),
    };
    const componentIo = {
      saveComponents: jest.fn(),
      hydrateComponents: jest.fn(),
      deleteComponents: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<ComponentIoService>;
    const prisma = { $transaction: jest.fn((callback: (tx: unknown) => Promise<void>) => callback(TX)) } as unknown as jest.Mocked<PrismaService>;

    return { schemaResolver, documents, componentIo, prisma };
  }

  it("throws NotFoundException when neither a draft nor a published row exists", async () => {
    const contentType = buildContentType(true);
    const { schemaResolver, documents, componentIo, prisma } = buildDeps(contentType);
    const service = new DeleteDocumentService(schemaResolver, documents, componentIo, prisma);

    await expect(service.execute("cv-page", "doc-1")).rejects.toThrow(NotFoundException);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it("deletes all versions and cascades component rows for both versions inside a transaction (mode A, draft only)", async () => {
    const contentType = buildContentType(true);
    const { schemaResolver, documents, componentIo, prisma } = buildDeps(contentType);
    documents.findByVersion.mockImplementation((_slug, _id, version) =>
      Promise.resolve(version === "draft" ? new DocumentEntity("doc-1", "draft", {}, new Date(), new Date(), null, null, null, null) : null),
    );

    const service = new DeleteDocumentService(schemaResolver, documents, componentIo, prisma);
    await service.execute("cv-page", "doc-1");

    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(componentIo.deleteComponents).toHaveBeenCalledWith("cv-page", "doc-1", "draft", contentType.fields, TX);
    expect(componentIo.deleteComponents).toHaveBeenCalledWith("cv-page", "doc-1", "published", contentType.fields, TX);
    expect(documents.deleteAllVersions).toHaveBeenCalledWith("cv-page", "doc-1", TX);
  });

  it("deletes the single live row and cascades its components (mode B)", async () => {
    const contentType = buildContentType(false);
    const { schemaResolver, documents, componentIo, prisma } = buildDeps(contentType);
    documents.findByVersion.mockImplementation((_slug, _id, version) =>
      Promise.resolve(version === "published" ? new DocumentEntity("doc-1", "published", {}, new Date(), new Date(), new Date(), null, null, null) : null),
    );

    const service = new DeleteDocumentService(schemaResolver, documents, componentIo, prisma);
    await service.execute("cv-page", "doc-1");

    expect(documents.deleteAllVersions).toHaveBeenCalledWith("cv-page", "doc-1", TX);
  });

  it("propagates NotFoundException for an unknown slug without touching any repository", async () => {
    const schemaResolver = { resolve: jest.fn().mockRejectedValue(new NotFoundException()) } as unknown as jest.Mocked<SchemaResolverService>;
    const documents = { findByVersion: jest.fn() } as unknown as jest.Mocked<IDocumentRepository>;
    const componentIo = { deleteComponents: jest.fn() } as unknown as jest.Mocked<ComponentIoService>;
    const prisma = { $transaction: jest.fn() } as unknown as jest.Mocked<PrismaService>;

    const service = new DeleteDocumentService(schemaResolver, documents, componentIo, prisma);

    await expect(service.execute("missing", "doc-1")).rejects.toThrow(NotFoundException);
    expect(documents.findByVersion).not.toHaveBeenCalled();
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });
});
