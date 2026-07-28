import { ContentTypeEntity } from "../../../content-type/domain/entities/content-type.entity";
import { DocumentEntity } from "../../domain/entities/document.entity";
import { IDocumentRepository } from "../../domain/repositories/document.repository";
import { ComponentIoService } from "../support/component-io.service";
import { SchemaResolverService } from "../support/schema-resolver.service";

import { BadRequestException, NotFoundException } from "@nestjs/common";

import { FieldDefinition } from "@/modules/content-type/domain/entities/field-definition";
import { PrismaService } from "@/prisma/application/prisma.service";

import { PublishSingleTypeService } from "./publish-single-type.service";

describe("PublishSingleTypeService", () => {
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
      hydrateComponents: jest.fn().mockResolvedValue({}),
      deleteComponents: jest.fn(),
    } as unknown as jest.Mocked<ComponentIoService>;
    const prisma = { $transaction: jest.fn((callback: (tx: unknown) => Promise<void>) => callback(TX)) } as unknown as jest.Mocked<PrismaService>;

    return { schemaResolver, documents, componentIo, prisma };
  }

  it("throws BadRequestException for a draftToPublish: false content type without touching any repository", async () => {
    const contentType = buildContentType(false);
    const { schemaResolver, documents, componentIo, prisma } = buildDeps(contentType);
    const service = new PublishSingleTypeService(schemaResolver, documents, componentIo, prisma);

    await expect(service.execute("homepage", "user-1")).rejects.toThrow(BadRequestException);

    expect(documents.findSingle).not.toHaveBeenCalled();
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it("throws NotFoundException when no draft exists (mode A)", async () => {
    const contentType = buildContentType(true);
    const { schemaResolver, documents, componentIo, prisma } = buildDeps(contentType);
    const service = new PublishSingleTypeService(schemaResolver, documents, componentIo, prisma);

    await expect(service.execute("homepage", "user-1")).rejects.toThrow(NotFoundException);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it("copies the draft row + hydrated components into a fresh published row (mode A, first publish)", async () => {
    const contentType = buildContentType(true);
    const { schemaResolver, documents, componentIo, prisma } = buildDeps(contentType);
    const draftCreatedAt = new Date("2026-01-01T00:00:00Z");
    const draft = new DocumentEntity("singleton-1", "draft", { headline: "Welcome" }, draftCreatedAt, draftCreatedAt, null, "user-0", "user-0", null);

    documents.findSingle.mockImplementation((_slug, version) => Promise.resolve(version === "draft" ? draft : null));
    componentIo.hydrateComponents.mockResolvedValue({ sections: [{ componentId: "sec-1" }] });

    const service = new PublishSingleTypeService(schemaResolver, documents, componentIo, prisma);
    const published = await service.execute("homepage", "user-1");

    expect(published.documentId).toBe("singleton-1");
    expect(published.version).toBe("published");
    expect(published.fields).toEqual({ headline: "Welcome", sections: [{ componentId: "sec-1" }] });
    expect(published.createdAt).toEqual(published.updatedAt);
    expect(published.publishedAt).toEqual(published.updatedAt);
    expect(published.createdBy).toBe("user-0");
    expect(published.updatedBy).toBe("user-0");
    expect(published.publishedBy).toBe("user-1");

    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(documents.upsert).toHaveBeenCalledWith("homepage", published, contentType.fields, TX);
    expect(componentIo.saveComponents).toHaveBeenCalledWith("homepage", "singleton-1", "published", contentType.fields, published.fields, TX);
  });

  it("preserves the existing published row's createdAt on republish (mode A)", async () => {
    const contentType = buildContentType(true);
    const { schemaResolver, documents, componentIo, prisma } = buildDeps(contentType);
    const draft = new DocumentEntity("singleton-1", "draft", { headline: "New" }, new Date("2026-01-01"), new Date("2026-01-03"), null, "user-0", "user-0", null);
    const existingPublishedCreatedAt = new Date("2026-01-02T00:00:00Z");
    const existingPublished = new DocumentEntity(
      "singleton-1",
      "published",
      { headline: "Old" },
      existingPublishedCreatedAt,
      existingPublishedCreatedAt,
      existingPublishedCreatedAt,
      "user-0",
      "user-0",
      "user-0",
    );

    documents.findSingle.mockImplementation((_slug, version) => Promise.resolve(version === "draft" ? draft : existingPublished));

    const service = new PublishSingleTypeService(schemaResolver, documents, componentIo, prisma);
    const published = await service.execute("homepage", "user-1");

    expect(published.createdAt).toBe(existingPublishedCreatedAt);
    expect(published.publishedBy).toBe("user-1");
    expect(published.publishedAt).not.toBe(existingPublishedCreatedAt);
  });
});
