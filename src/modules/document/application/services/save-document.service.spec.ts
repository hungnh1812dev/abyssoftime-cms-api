import { ContentTypeEntity } from "../../../content-type/domain/entities/content-type.entity";
import { DocumentEntity } from "../../domain/entities/document.entity";
import { IDocumentRepository } from "../../domain/repositories/document.repository";
import { ComponentIoService } from "../support/component-io.service";
import { SchemaResolverService } from "../support/schema-resolver.service";

import { BadRequestException, NotFoundException } from "@nestjs/common";

import { FieldDefinition } from "@/modules/content-type/domain/entities/field-definition";
import { PrismaService } from "@/prisma/application/prisma.service";

import { SaveDocumentService } from "./save-document.service";

describe("SaveDocumentService", () => {
  const FIELDS: FieldDefinition[] = [{ name: "position", type: "text" }];
  const TX = { fake: "tx" };

  function buildContentType(draftToPublish: boolean, kind: "single" | "collection" = "collection"): ContentTypeEntity {
    return new ContentTypeEntity("ct-1", "cv-page", "CV Page", kind, draftToPublish, FIELDS, ["position"], new Date(), new Date());
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
      hydrateComponents: jest.fn(),
      deleteComponents: jest.fn(),
    } as unknown as jest.Mocked<ComponentIoService>;
    const prisma = { $transaction: jest.fn((callback: (tx: unknown) => Promise<void>) => callback(TX)) } as unknown as jest.Mocked<PrismaService>;

    return { schemaResolver, documents, componentIo, prisma };
  }

  it("creates a new draft row (mode A) with a generated documentId when none is given", async () => {
    const contentType = buildContentType(true);
    const { schemaResolver, documents, componentIo, prisma } = buildDeps(contentType);
    const service = new SaveDocumentService(schemaResolver, documents, componentIo, prisma);

    const data = { position: "Engineer" };
    const doc = await service.execute("cv-page", data, undefined, "user-1");

    expect(schemaResolver.resolve).toHaveBeenCalledWith("cv-page");
    expect(doc.version).toBe("draft");
    expect(doc.documentId).toEqual(expect.any(String));
    expect(doc.documentId.length).toBeGreaterThan(0);
    expect(doc.fields).toEqual(data);
    expect(doc.publishedAt).toBeNull();
    expect(doc.publishedBy).toBeNull();
    expect(doc.createdBy).toBe("user-1");
    expect(doc.updatedBy).toBe("user-1");
    expect(doc.createdAt).toEqual(doc.updatedAt);

    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(documents.upsert).toHaveBeenCalledWith("cv-page", doc, contentType.fields, TX);
    expect(componentIo.saveComponents).toHaveBeenCalledWith("cv-page", doc.documentId, "draft", contentType.fields, data, TX);
  });

  it("uses the given documentId as-is when provided", async () => {
    const contentType = buildContentType(true);
    const { schemaResolver, documents, componentIo, prisma } = buildDeps(contentType);
    const service = new SaveDocumentService(schemaResolver, documents, componentIo, prisma);

    const doc = await service.execute("cv-page", { position: "Engineer" }, "doc-fixed", "user-1");

    expect(doc.documentId).toBe("doc-fixed");
  });

  it("preserves createdAt/createdBy from the existing draft row on update (mode A)", async () => {
    const contentType = buildContentType(true);
    const { schemaResolver, documents, componentIo, prisma } = buildDeps(contentType);
    const existingCreatedAt = new Date("2026-01-01T00:00:00Z");
    documents.findByVersion.mockResolvedValue(new DocumentEntity("doc-1", "draft", { position: "Old" }, existingCreatedAt, existingCreatedAt, null, "user-0", "user-0", null));

    const service = new SaveDocumentService(schemaResolver, documents, componentIo, prisma);
    const doc = await service.execute("cv-page", { position: "New" }, "doc-1", "user-1");

    expect(doc.createdAt).toBe(existingCreatedAt);
    expect(doc.createdBy).toBe("user-0");
    expect(doc.updatedBy).toBe("user-1");
    expect(doc.updatedAt).not.toBe(existingCreatedAt);
  });

  it("writes directly to the published row and stamps publishedAt/publishedBy (mode B)", async () => {
    const contentType = buildContentType(false);
    const { schemaResolver, documents, componentIo, prisma } = buildDeps(contentType);

    const service = new SaveDocumentService(schemaResolver, documents, componentIo, prisma);
    const doc = await service.execute("cv-page", { position: "Engineer" }, "doc-1", "user-1");

    expect(doc.version).toBe("published");
    expect(doc.publishedAt).toEqual(doc.updatedAt);
    expect(doc.publishedBy).toBe("user-1");
    expect(documents.findByVersion).toHaveBeenCalledWith("cv-page", "doc-1", "published", contentType.fields);
    expect(componentIo.saveComponents).toHaveBeenCalledWith("cv-page", "doc-1", "published", contentType.fields, { position: "Engineer" }, TX);
  });

  it("propagates NotFoundException for an unknown slug without touching any repository", async () => {
    const schemaResolver = { resolve: jest.fn().mockRejectedValue(new NotFoundException()) } as unknown as jest.Mocked<SchemaResolverService>;
    const documents = { findByVersion: jest.fn(), upsert: jest.fn() } as unknown as jest.Mocked<IDocumentRepository>;
    const componentIo = { saveComponents: jest.fn() } as unknown as jest.Mocked<ComponentIoService>;
    const prisma = { $transaction: jest.fn() } as unknown as jest.Mocked<PrismaService>;

    const service = new SaveDocumentService(schemaResolver, documents, componentIo, prisma);

    await expect(service.execute("missing", {}, undefined, "user-1")).rejects.toThrow(NotFoundException);
    expect(documents.findByVersion).not.toHaveBeenCalled();
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it("throws BadRequestException when the content type is single-kind, without touching any repository", async () => {
    const contentType = buildContentType(true, "single");
    const { schemaResolver, documents, componentIo, prisma } = buildDeps(contentType);
    const service = new SaveDocumentService(schemaResolver, documents, componentIo, prisma);

    await expect(service.execute("cv-page", { position: "Engineer" }, undefined, "user-1")).rejects.toThrow(BadRequestException);
    expect(documents.findByVersion).not.toHaveBeenCalled();
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });
});
