import { ContentTypeEntity } from "../../../content-type/domain/entities/content-type.entity";
import { DocumentEntity } from "../../domain/entities/document.entity";
import { IDocumentRepository } from "../../domain/repositories/document.repository";
import { ComponentIoService } from "../support/component-io.service";
import { SchemaResolverService } from "../support/schema-resolver.service";

import { NotFoundException } from "@nestjs/common";

import { FieldDefinition } from "@/modules/content-type/domain/entities/field-definition";

import { GetDocumentForEditService } from "./get-document-for-edit.service";

describe("GetDocumentForEditService", () => {
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

  it("throws NotFoundException when no draft exists (mode A)", async () => {
    const contentType = buildContentType(true);
    const { schemaResolver, documents, componentIo } = buildDeps(contentType);
    const service = new GetDocumentForEditService(schemaResolver, documents, componentIo);

    await expect(service.execute("cv-page", "doc-1")).rejects.toThrow(NotFoundException);
    expect(componentIo.hydrateComponents).not.toHaveBeenCalled();
  });

  it("returns the draft with status draft when no published row exists (mode A)", async () => {
    const contentType = buildContentType(true);
    const { schemaResolver, documents, componentIo } = buildDeps(contentType);
    const draft = new DocumentEntity("doc-1", "draft", { position: "Engineer" }, new Date("2026-01-01"), new Date("2026-01-01"), null, "user-1", "user-1", null);
    documents.findByVersion.mockImplementation((_slug, _id, version) => Promise.resolve(version === "draft" ? draft : null));
    componentIo.hydrateComponents.mockResolvedValue({ skills: [] });

    const service = new GetDocumentForEditService(schemaResolver, documents, componentIo);
    const result = await service.execute("cv-page", "doc-1");

    expect(result.status).toBe("draft");
    expect(result.document.fields).toEqual({ position: "Engineer", skills: [] });
    expect(componentIo.hydrateComponents).toHaveBeenCalledWith("cv-page", "doc-1", "draft", contentType.fields);
  });

  it("returns status modified when the draft was updated after the published row (mode A)", async () => {
    const contentType = buildContentType(true);
    const { schemaResolver, documents, componentIo } = buildDeps(contentType);
    const draft = new DocumentEntity("doc-1", "draft", { position: "New" }, new Date("2026-01-01"), new Date("2026-01-03"), null, "user-1", "user-1", null);
    const published = new DocumentEntity(
      "doc-1",
      "published",
      { position: "Old" },
      new Date("2026-01-01"),
      new Date("2026-01-02"),
      new Date("2026-01-02"),
      "user-1",
      "user-1",
      "user-1",
    );
    documents.findByVersion.mockImplementation((_slug, _id, version) => Promise.resolve(version === "draft" ? draft : published));

    const service = new GetDocumentForEditService(schemaResolver, documents, componentIo);
    const result = await service.execute("cv-page", "doc-1");

    expect(result.status).toBe("modified");
  });

  it("returns status published when the draft is not newer than the published row (mode A)", async () => {
    const contentType = buildContentType(true);
    const { schemaResolver, documents, componentIo } = buildDeps(contentType);
    const sameTime = new Date("2026-01-01");
    const draft = new DocumentEntity("doc-1", "draft", { position: "Same" }, sameTime, sameTime, null, "user-1", "user-1", null);
    const published = new DocumentEntity("doc-1", "published", { position: "Same" }, sameTime, sameTime, sameTime, "user-1", "user-1", "user-1");
    documents.findByVersion.mockImplementation((_slug, _id, version) => Promise.resolve(version === "draft" ? draft : published));

    const service = new GetDocumentForEditService(schemaResolver, documents, componentIo);
    const result = await service.execute("cv-page", "doc-1");

    expect(result.status).toBe("published");
  });

  it("returns the single live row with status published, fetching only once (mode B)", async () => {
    const contentType = buildContentType(false);
    const { schemaResolver, documents, componentIo } = buildDeps(contentType);
    const live = new DocumentEntity("doc-1", "published", { position: "Engineer" }, new Date(), new Date(), new Date(), "user-1", "user-1", "user-1");
    documents.findByVersion.mockResolvedValue(live);

    const service = new GetDocumentForEditService(schemaResolver, documents, componentIo);
    const result = await service.execute("cv-page", "doc-1");

    expect(result.status).toBe("published");
    expect(documents.findByVersion).toHaveBeenCalledTimes(1);
    expect(documents.findByVersion).toHaveBeenCalledWith("cv-page", "doc-1", "published", contentType.fields);
  });

  it("throws NotFoundException when no live row exists (mode B)", async () => {
    const contentType = buildContentType(false);
    const { schemaResolver, documents, componentIo } = buildDeps(contentType);
    const service = new GetDocumentForEditService(schemaResolver, documents, componentIo);

    await expect(service.execute("cv-page", "doc-1")).rejects.toThrow(NotFoundException);
  });
});
