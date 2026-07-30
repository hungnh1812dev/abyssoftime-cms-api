import { ContentTypeEntity } from "../../../content-type/domain/entities/content-type.entity";
import { DocumentEntity } from "../../domain/entities/document.entity";
import { IDocumentRepository } from "../../domain/repositories/document.repository";
import { ComponentIoService } from "../support/component-io.service";
import { SchemaResolverService } from "../support/schema-resolver.service";

import { NotFoundException } from "@nestjs/common";

import { FieldDefinition } from "@/modules/content-type/domain/entities/field-definition";

import { GetPublicDocumentService } from "./get-public-document.service";

describe("GetPublicDocumentService", () => {
  const FIELDS: FieldDefinition[] = [{ name: "position", type: "text" }];

  function buildContentType(draftToPublish: boolean): ContentTypeEntity {
    return new ContentTypeEntity("ct-1", "cv-page", "CV Page", "collection", draftToPublish, FIELDS, ["position"], new Date(), new Date());
  }

  function buildDeps(contentType: ContentTypeEntity) {
    const schemaResolver = { resolve: jest.fn().mockResolvedValue(contentType) } as unknown as jest.Mocked<SchemaResolverService>;
    const documents: jest.Mocked<IDocumentRepository> = {
      findByVersion: jest.fn().mockResolvedValue(null),
      upsert: jest.fn(),
      deleteAllVersions: jest.fn(),
      deleteVersion: jest.fn(),
      listPaginated: jest.fn(),
      findManyByVersion: jest.fn(),
      findSingle: jest.fn(),
    };
    const componentIo = {
      saveComponents: jest.fn(),
      hydrateComponents: jest.fn().mockResolvedValue({}),
      deleteComponents: jest.fn(),
    } as unknown as jest.Mocked<ComponentIoService>;

    return { schemaResolver, documents, componentIo };
  }

  it("throws NotFoundException when no published row exists", async () => {
    const contentType = buildContentType(true);
    const { schemaResolver, documents, componentIo } = buildDeps(contentType);
    const service = new GetPublicDocumentService(schemaResolver, documents, componentIo);

    await expect(service.execute("cv-page", "doc-1")).rejects.toThrow(NotFoundException);
  });

  it("returns the published row hydrated with its components (mode A), reading only the published version", async () => {
    const contentType = buildContentType(true);
    const { schemaResolver, documents, componentIo } = buildDeps(contentType);
    const published = new DocumentEntity("doc-1", "published", { position: "Engineer" }, new Date(), new Date(), new Date(), "user-1", "user-1", "user-1");
    documents.findByVersion.mockResolvedValue(published);
    componentIo.hydrateComponents.mockResolvedValue({ skills: [{ componentId: "skill-1", level: "expert" }] });

    const service = new GetPublicDocumentService(schemaResolver, documents, componentIo);
    const doc = await service.execute("cv-page", "doc-1");

    expect(documents.findByVersion).toHaveBeenCalledTimes(1);
    expect(documents.findByVersion).toHaveBeenCalledWith("cv-page", "doc-1", "published", contentType.fields);
    expect(componentIo.hydrateComponents).toHaveBeenCalledWith("cv-page", "doc-1", "published", contentType.fields);
    expect(doc.fields).toEqual({ position: "Engineer", skills: [{ componentId: "skill-1", level: "expert" }] });
  });

  it("reads the published version directly for a draftToPublish: false content type too (mode B)", async () => {
    const contentType = buildContentType(false);
    const { schemaResolver, documents, componentIo } = buildDeps(contentType);
    const live = new DocumentEntity("doc-1", "published", { position: "Engineer" }, new Date(), new Date(), new Date(), "user-1", "user-1", "user-1");
    documents.findByVersion.mockResolvedValue(live);

    const service = new GetPublicDocumentService(schemaResolver, documents, componentIo);
    const doc = await service.execute("cv-page", "doc-1");

    expect(documents.findByVersion).toHaveBeenCalledWith("cv-page", "doc-1", "published", contentType.fields);
    expect(doc.documentId).toBe("doc-1");
  });
});
