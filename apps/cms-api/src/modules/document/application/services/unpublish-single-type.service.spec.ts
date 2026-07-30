import { ContentTypeEntity } from "../../../content-type/domain/entities/content-type.entity";
import { DocumentEntity } from "../../domain/entities/document.entity";
import { IDocumentRepository } from "../../domain/repositories/document.repository";
import { ComponentIoService } from "../support/component-io.service";
import { SchemaResolverService } from "../support/schema-resolver.service";

import { BadRequestException, NotFoundException } from "@nestjs/common";

import { FieldDefinition } from "@/modules/content-type/domain/entities/field-definition";
import { PrismaService } from "@/prisma/application/prisma.service";

import { UnpublishSingleTypeService } from "./unpublish-single-type.service";

describe("UnpublishSingleTypeService", () => {
  const FIELDS: FieldDefinition[] = [{ name: "headline", type: "text" }];
  const TX = { fake: "tx" };

  function buildContentType(draftToPublish: boolean): ContentTypeEntity {
    return new ContentTypeEntity("ct-1", "homepage", "Homepage", "single", draftToPublish, FIELDS, ["headline"], new Date(), new Date());
  }

  function buildDeps(contentType: ContentTypeEntity) {
    const schemaResolver = { resolve: jest.fn().mockResolvedValue(contentType) } as unknown as jest.Mocked<SchemaResolverService>;
    const documents: jest.Mocked<IDocumentRepository> = {
      findByVersion: jest.fn(),
      upsert: jest.fn(),
      deleteAllVersions: jest.fn(),
      deleteVersion: jest.fn().mockResolvedValue(undefined),
      listPaginated: jest.fn(),
      findManyByVersion: jest.fn(),
      findSingle: jest.fn().mockResolvedValue(null),
    };
    const componentIo = {
      saveComponents: jest.fn(),
      hydrateComponents: jest.fn(),
      deleteComponents: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<ComponentIoService>;
    const prisma = { $transaction: jest.fn((callback: (tx: unknown) => Promise<void>) => callback(TX)) } as unknown as jest.Mocked<PrismaService>;

    return { schemaResolver, documents, componentIo, prisma };
  }

  it("throws BadRequestException for a draftToPublish: false content type without touching any repository", async () => {
    const contentType = buildContentType(false);
    const { schemaResolver, documents, componentIo, prisma } = buildDeps(contentType);
    const service = new UnpublishSingleTypeService(schemaResolver, documents, componentIo, prisma);

    await expect(service.execute("homepage")).rejects.toThrow(BadRequestException);

    expect(documents.findSingle).not.toHaveBeenCalled();
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it("throws NotFoundException when no published row exists (mode A)", async () => {
    const contentType = buildContentType(true);
    const { schemaResolver, documents, componentIo, prisma } = buildDeps(contentType);
    const service = new UnpublishSingleTypeService(schemaResolver, documents, componentIo, prisma);

    await expect(service.execute("homepage")).rejects.toThrow(NotFoundException);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it("deletes the published row and cascades its components inside a transaction, leaving the draft intact (mode A)", async () => {
    const contentType = buildContentType(true);
    const { schemaResolver, documents, componentIo, prisma } = buildDeps(contentType);
    documents.findSingle.mockResolvedValue(new DocumentEntity("singleton-1", "published", { headline: "Welcome" }, new Date(), new Date(), new Date(), null, null, null));

    const service = new UnpublishSingleTypeService(schemaResolver, documents, componentIo, prisma);
    await service.execute("homepage");

    expect(documents.findSingle).toHaveBeenCalledWith("homepage", "published", contentType.fields);
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(componentIo.deleteComponents).toHaveBeenCalledWith("homepage", "singleton-1", "published", contentType.fields, TX);
    expect(documents.deleteVersion).toHaveBeenCalledWith("homepage", "singleton-1", "published", TX);
    expect(documents.deleteAllVersions).not.toHaveBeenCalled();
  });
});
