import { ContentTypeEntity } from "../../../content-type/domain/entities/content-type.entity";
import { DocumentEntity } from "../../domain/entities/document.entity";
import { IDocumentRepository } from "../../domain/repositories/document.repository";
import { ComponentIoService } from "../support/component-io.service";
import { SchemaResolverService } from "../support/schema-resolver.service";

import { NotFoundException } from "@nestjs/common";

import { FieldDefinition } from "@/modules/content-type/domain/entities/field-definition";

import { GetSingleTypeService } from "./get-single-type.service";

describe("GetSingleTypeService", () => {
  const FIELDS: FieldDefinition[] = [{ name: "headline", type: "text" }];

  function buildContentType(draftToPublish: boolean): ContentTypeEntity {
    return new ContentTypeEntity("ct-1", "homepage", "Homepage", "single", draftToPublish, FIELDS, ["headline"], new Date(), new Date());
  }

  function buildDeps(contentType: ContentTypeEntity) {
    const schemaResolver = { resolve: jest.fn().mockResolvedValue(contentType) } as unknown as jest.Mocked<SchemaResolverService>;
    const documents: jest.Mocked<IDocumentRepository> = {
      findByVersion: jest.fn(),
      upsert: jest.fn(),
      deleteAllVersions: jest.fn(),
      deleteVersion: jest.fn(),
      listPaginated: jest.fn(),
      findManyByVersion: jest.fn(),
      findSingle: jest.fn().mockResolvedValue(null),
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
    const service = new GetSingleTypeService(schemaResolver, documents, componentIo);

    await expect(service.execute("homepage")).rejects.toThrow(NotFoundException);
    expect(componentIo.hydrateComponents).not.toHaveBeenCalled();
  });

  it("returns the draft with status draft when no published row exists (mode A)", async () => {
    const contentType = buildContentType(true);
    const { schemaResolver, documents, componentIo } = buildDeps(contentType);
    const draft = new DocumentEntity("singleton-1", "draft", { headline: "Hello" }, new Date("2026-01-01"), new Date("2026-01-01"), null, "user-1", "user-1", null);
    documents.findSingle.mockImplementation((_slug, version) => Promise.resolve(version === "draft" ? draft : null));
    componentIo.hydrateComponents.mockResolvedValue({ sections: [] });

    const service = new GetSingleTypeService(schemaResolver, documents, componentIo);
    const result = await service.execute("homepage");

    expect(result.status).toBe("draft");
    expect(result.document.fields).toEqual({ headline: "Hello", sections: [] });
    expect(documents.findSingle).toHaveBeenCalledWith("homepage", "draft", contentType.fields);
    expect(componentIo.hydrateComponents).toHaveBeenCalledWith("homepage", "singleton-1", "draft", contentType.fields);
  });

  it("returns status modified when the draft was updated after the published row (mode A)", async () => {
    const contentType = buildContentType(true);
    const { schemaResolver, documents, componentIo } = buildDeps(contentType);
    const draft = new DocumentEntity("singleton-1", "draft", { headline: "New" }, new Date("2026-01-01"), new Date("2026-01-03"), null, "user-1", "user-1", null);
    const published = new DocumentEntity(
      "singleton-1",
      "published",
      { headline: "Old" },
      new Date("2026-01-01"),
      new Date("2026-01-02"),
      new Date("2026-01-02"),
      "user-1",
      "user-1",
      "user-1",
    );
    documents.findSingle.mockImplementation((_slug, version) => Promise.resolve(version === "draft" ? draft : published));

    const service = new GetSingleTypeService(schemaResolver, documents, componentIo);
    const result = await service.execute("homepage");

    expect(result.status).toBe("modified");
  });

  it("returns status published when the draft is not newer than the published row (mode A)", async () => {
    const contentType = buildContentType(true);
    const { schemaResolver, documents, componentIo } = buildDeps(contentType);
    const sameTime = new Date("2026-01-01");
    const draft = new DocumentEntity("singleton-1", "draft", { headline: "Same" }, sameTime, sameTime, null, "user-1", "user-1", null);
    const published = new DocumentEntity("singleton-1", "published", { headline: "Same" }, sameTime, sameTime, sameTime, "user-1", "user-1", "user-1");
    documents.findSingle.mockImplementation((_slug, version) => Promise.resolve(version === "draft" ? draft : published));

    const service = new GetSingleTypeService(schemaResolver, documents, componentIo);
    const result = await service.execute("homepage");

    expect(result.status).toBe("published");
  });

  it("returns the single live row with status published, fetching only once (mode B)", async () => {
    const contentType = buildContentType(false);
    const { schemaResolver, documents, componentIo } = buildDeps(contentType);
    const live = new DocumentEntity("singleton-1", "published", { headline: "Hello" }, new Date(), new Date(), new Date(), "user-1", "user-1", "user-1");
    documents.findSingle.mockResolvedValue(live);

    const service = new GetSingleTypeService(schemaResolver, documents, componentIo);
    const result = await service.execute("homepage");

    expect(result.status).toBe("published");
    expect(documents.findSingle).toHaveBeenCalledTimes(1);
    expect(documents.findSingle).toHaveBeenCalledWith("homepage", "published", contentType.fields);
  });

  it("throws NotFoundException when no live row exists (mode B)", async () => {
    const contentType = buildContentType(false);
    const { schemaResolver, documents, componentIo } = buildDeps(contentType);
    const service = new GetSingleTypeService(schemaResolver, documents, componentIo);

    await expect(service.execute("homepage")).rejects.toThrow(NotFoundException);
  });
});
