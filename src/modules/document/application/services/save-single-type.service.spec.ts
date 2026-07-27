import { ContentTypeEntity } from "../../../content-type/domain/entities/content-type.entity";
import { DocumentEntity } from "../../domain/entities/document.entity";
import { IDocumentRepository } from "../../domain/repositories/document.repository";
import { ComponentIoService } from "../support/component-io.service";
import { SchemaResolverService } from "../support/schema-resolver.service";

import { NotFoundException } from "@nestjs/common";

import { FieldDefinition } from "@/modules/content-type/domain/entities/field-definition";
import { PrismaService } from "@/prisma/application/prisma.service";

import { SaveSingleTypeService } from "./save-single-type.service";

describe("SaveSingleTypeService", () => {
  const FIELDS: FieldDefinition[] = [{ name: "headline", type: "text" }];
  const TX = { fake: "tx" };

  function buildContentType(draftToPublish: boolean): ContentTypeEntity {
    return new ContentTypeEntity("ct-1", "homepage", "Homepage", "single", draftToPublish, FIELDS, ["headline"], new Date(), new Date());
  }

  function buildDeps(contentType: ContentTypeEntity) {
    const schemaResolver = { resolve: jest.fn().mockResolvedValue(contentType) } as unknown as jest.Mocked<SchemaResolverService>;
    const documents: jest.Mocked<IDocumentRepository> = {
      findByVersion: jest.fn(),
      upsert: jest.fn().mockResolvedValue(undefined),
      deleteAllVersions: jest.fn(),
      deleteVersion: jest.fn(),
      listPaginated: jest.fn(),
      findManyByVersion: jest.fn(),
      findSingle: jest.fn().mockResolvedValue(null),
    };
    const componentIo = {
      saveComponents: jest.fn().mockResolvedValue(undefined),
      hydrateComponents: jest.fn(),
      deleteComponents: jest.fn(),
    } as unknown as jest.Mocked<ComponentIoService>;
    const prisma = { $transaction: jest.fn((callback: (tx: unknown) => Promise<void>) => callback(TX)) } as unknown as jest.Mocked<PrismaService>;

    return { schemaResolver, documents, componentIo, prisma };
  }

  it("creates a new draft row (mode A) with a generated documentId on first save", async () => {
    const contentType = buildContentType(true);
    const { schemaResolver, documents, componentIo, prisma } = buildDeps(contentType);
    const service = new SaveSingleTypeService(schemaResolver, documents, componentIo, prisma);

    const data = { headline: "Welcome" };
    const doc = await service.execute("homepage", data, "user-1");

    expect(schemaResolver.resolve).toHaveBeenCalledWith("homepage");
    expect(documents.findSingle).toHaveBeenCalledWith("homepage", "draft", contentType.fields);
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
    expect(documents.upsert).toHaveBeenCalledWith("homepage", doc, contentType.fields, TX);
    expect(componentIo.saveComponents).toHaveBeenCalledWith("homepage", doc.documentId, "draft", contentType.fields, data, TX);
  });

  it("reuses the existing singleton's documentId and preserves createdAt/createdBy on update (mode A)", async () => {
    const contentType = buildContentType(true);
    const { schemaResolver, documents, componentIo, prisma } = buildDeps(contentType);
    const existingCreatedAt = new Date("2026-01-01T00:00:00Z");
    documents.findSingle.mockResolvedValue(new DocumentEntity("singleton-1", "draft", { headline: "Old" }, existingCreatedAt, existingCreatedAt, null, "user-0", "user-0", null));

    const service = new SaveSingleTypeService(schemaResolver, documents, componentIo, prisma);
    const doc = await service.execute("homepage", { headline: "New" }, "user-1");

    expect(doc.documentId).toBe("singleton-1");
    expect(doc.createdAt).toBe(existingCreatedAt);
    expect(doc.createdBy).toBe("user-0");
    expect(doc.updatedBy).toBe("user-1");
    expect(doc.updatedAt).not.toBe(existingCreatedAt);
  });

  it("writes directly to the published row and stamps publishedAt/publishedBy (mode B)", async () => {
    const contentType = buildContentType(false);
    const { schemaResolver, documents, componentIo, prisma } = buildDeps(contentType);

    const service = new SaveSingleTypeService(schemaResolver, documents, componentIo, prisma);
    const doc = await service.execute("homepage", { headline: "Welcome" }, "user-1");

    expect(doc.version).toBe("published");
    expect(doc.publishedAt).toEqual(doc.updatedAt);
    expect(doc.publishedBy).toBe("user-1");
    expect(documents.findSingle).toHaveBeenCalledWith("homepage", "published", contentType.fields);
    expect(componentIo.saveComponents).toHaveBeenCalledWith("homepage", doc.documentId, "published", contentType.fields, { headline: "Welcome" }, TX);
  });

  it("reuses the existing live row's documentId on update (mode B)", async () => {
    const contentType = buildContentType(false);
    const { schemaResolver, documents, componentIo, prisma } = buildDeps(contentType);
    documents.findSingle.mockResolvedValue(new DocumentEntity("singleton-1", "published", { headline: "Old" }, new Date(), new Date(), new Date(), "user-0", "user-0", "user-0"));

    const service = new SaveSingleTypeService(schemaResolver, documents, componentIo, prisma);
    const doc = await service.execute("homepage", { headline: "New" }, "user-1");

    expect(doc.documentId).toBe("singleton-1");
  });

  it("propagates NotFoundException for an unknown slug without touching any repository", async () => {
    const schemaResolver = { resolve: jest.fn().mockRejectedValue(new NotFoundException()) } as unknown as jest.Mocked<SchemaResolverService>;
    const documents = { findSingle: jest.fn(), upsert: jest.fn() } as unknown as jest.Mocked<IDocumentRepository>;
    const componentIo = { saveComponents: jest.fn() } as unknown as jest.Mocked<ComponentIoService>;
    const prisma = { $transaction: jest.fn() } as unknown as jest.Mocked<PrismaService>;

    const service = new SaveSingleTypeService(schemaResolver, documents, componentIo, prisma);

    await expect(service.execute("missing", {}, "user-1")).rejects.toThrow(NotFoundException);
    expect(documents.findSingle).not.toHaveBeenCalled();
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });
});
