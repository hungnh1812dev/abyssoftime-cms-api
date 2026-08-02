import { ContentTypeEntity } from "../../../content-type/domain/entities/content-type.entity";
import { DocumentEntity } from "../../domain/entities/document.entity";
import { IDocumentRepository } from "../../domain/repositories/document.repository";
import { ComponentIoService } from "../support/component-io.service";
import { SchemaResolverService } from "../support/schema-resolver.service";

import { BadRequestException, NotFoundException } from "@nestjs/common";

import { FieldDefinition } from "@/modules/content-type/domain/entities/field-definition";
import { PrismaService } from "@/prisma/application/prisma.service";

import { PublishDocumentService } from "./publish-document.service";

describe("PublishDocumentService", () => {
  const FIELDS: FieldDefinition[] = [
    { name: "position", type: "text" },
    { name: "skills", type: "component", component: "skill", repeatable: true, fields: [{ name: "level", type: "text" }] },
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

  it("throws BadRequestException for a draftToPublish: false content type without touching any repository", async () => {
    const contentType = buildContentType(false);
    const { schemaResolver, documents, componentIo, prisma } = buildDeps(contentType);
    const service = new PublishDocumentService(schemaResolver, documents, componentIo, prisma);

    await expect(service.execute("cv-page", "doc-1", "user-1")).rejects.toThrow(BadRequestException);

    expect(documents.findByVersion).not.toHaveBeenCalled();
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it("throws NotFoundException when no draft exists (mode A)", async () => {
    const contentType = buildContentType(true);
    const { schemaResolver, documents, componentIo, prisma } = buildDeps(contentType);
    documents.findByVersion.mockResolvedValue(null);
    const service = new PublishDocumentService(schemaResolver, documents, componentIo, prisma);

    await expect(service.execute("cv-page", "doc-1", "user-1")).rejects.toThrow(NotFoundException);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it("copies the draft row + hydrated components into a fresh published row (mode A, first publish)", async () => {
    const contentType = buildContentType(true);
    const { schemaResolver, documents, componentIo, prisma } = buildDeps(contentType);
    const draftCreatedAt = new Date("2026-01-01T00:00:00Z");
    const draft = new DocumentEntity("doc-1", "draft", { position: "Engineer" }, draftCreatedAt, draftCreatedAt, null, "user-0", "user-0", null);

    documents.findByVersion.mockImplementation((_slug, _id, version) => Promise.resolve(version === "draft" ? draft : null));
    componentIo.hydrateComponents.mockResolvedValue({ skills: [{ componentId: "skill-1", level: "expert" }] });

    const service = new PublishDocumentService(schemaResolver, documents, componentIo, prisma);
    const published = await service.execute("cv-page", "doc-1", "user-1");

    expect(published.version).toBe("published");
    expect(published.fields).toEqual({ position: "Engineer", skills: [{ componentId: "skill-1", level: "expert" }] });
    expect(published.createdAt).toEqual(published.updatedAt);
    expect(published.publishedAt).toEqual(published.updatedAt);
    expect(published.createdBy).toBe("user-0");
    expect(published.updatedBy).toBe("user-0");
    expect(published.publishedBy).toBe("user-1");

    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(documents.upsert).toHaveBeenCalledWith("cv-page", published, contentType.fields, TX);
    expect(componentIo.saveComponents).toHaveBeenCalledWith("cv-page", "doc-1", "published", contentType.fields, published.fields, TX);
  });

  it("preserves the existing published row's createdAt on republish (mode A)", async () => {
    const contentType = buildContentType(true);
    const { schemaResolver, documents, componentIo, prisma } = buildDeps(contentType);
    const draft = new DocumentEntity("doc-1", "draft", { position: "Engineer" }, new Date("2026-01-01"), new Date("2026-01-03"), null, "user-0", "user-0", null);
    const existingPublishedCreatedAt = new Date("2026-01-02T00:00:00Z");
    const existingPublished = new DocumentEntity(
      "doc-1",
      "published",
      { position: "Old" },
      existingPublishedCreatedAt,
      existingPublishedCreatedAt,
      existingPublishedCreatedAt,
      "user-0",
      "user-0",
      "user-0",
    );

    documents.findByVersion.mockImplementation((_slug, _id, version) => Promise.resolve(version === "draft" ? draft : existingPublished));

    const service = new PublishDocumentService(schemaResolver, documents, componentIo, prisma);
    const published = await service.execute("cv-page", "doc-1", "user-1");

    expect(published.createdAt).toBe(existingPublishedCreatedAt);
    expect(published.publishedBy).toBe("user-1");
    expect(published.publishedAt).not.toBe(existingPublishedCreatedAt);
  });

  it("skips schema resolve when a contentType is passed", async () => {
    const contentType = buildContentType(true);
    const { schemaResolver, documents, componentIo, prisma } = buildDeps(contentType);
    const draft = new DocumentEntity("doc-1", "draft", { position: "Engineer" }, new Date(), new Date(), null, "user-0", "user-0", null);
    documents.findByVersion.mockImplementation((_slug, _id, version) => Promise.resolve(version === "draft" ? draft : null));
    const service = new PublishDocumentService(schemaResolver, documents, componentIo, prisma);

    await service.execute("cv-page", "doc-1", "user-1", contentType);

    expect(schemaResolver.resolve).not.toHaveBeenCalled();
  });

  it("uses draftOverride instead of looking up the draft row, merging in hydrated components", async () => {
    const contentType = buildContentType(true);
    const { schemaResolver, documents, componentIo, prisma } = buildDeps(contentType);
    const draftOverride = new DocumentEntity(
      "doc-1",
      "draft",
      { position: "Engineer", skills: [] },
      new Date("2026-01-01"),
      new Date("2026-01-01"),
      null,
      "user-0",
      "user-0",
      null,
    );
    componentIo.hydrateComponents.mockResolvedValue({ skills: [{ componentId: "skill-1", level: "expert" }] });

    const service = new PublishDocumentService(schemaResolver, documents, componentIo, prisma);
    const published = await service.execute("cv-page", "doc-1", "user-1", contentType, draftOverride);

    expect(documents.findByVersion).not.toHaveBeenCalledWith("cv-page", "doc-1", "draft", contentType.fields);
    expect(published.fields).toEqual({ position: "Engineer", skills: [{ componentId: "skill-1", level: "expert" }] });
    expect(published.createdBy).toBe("user-0");
  });

  it("skips the published-row lookup when isNewDocument is true", async () => {
    const contentType = buildContentType(true);
    const { schemaResolver, documents, componentIo, prisma } = buildDeps(contentType);
    const draftOverride = new DocumentEntity("doc-1", "draft", { position: "Engineer" }, new Date("2026-01-01"), new Date("2026-01-01"), null, "user-0", "user-0", null);

    const service = new PublishDocumentService(schemaResolver, documents, componentIo, prisma);
    const published = await service.execute("cv-page", "doc-1", "user-1", contentType, draftOverride, true);

    expect(documents.findByVersion).not.toHaveBeenCalled();
    expect(published.createdAt).toEqual(published.updatedAt);
  });
});
