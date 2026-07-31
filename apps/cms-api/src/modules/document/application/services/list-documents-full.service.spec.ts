import { ContentTypeEntity } from "../../../content-type/domain/entities/content-type.entity";
import { DocumentEntity } from "../../domain/entities/document.entity";
import { IDocumentRepository } from "../../domain/repositories/document.repository";
import { ComponentIoService } from "../support/component-io.service";
import { SchemaResolverService } from "../support/schema-resolver.service";

import { BadRequestException } from "@nestjs/common";

import { FieldDefinition } from "@/modules/content-type/domain/entities/field-definition";

import { FullListOptions, ListDocumentsFullService } from "./list-documents-full.service";

describe("ListDocumentsFullService", () => {
  const FIELDS: FieldDefinition[] = [
    { name: "wordGroup", type: "text" },
    { name: "phonetics", type: "component", component: "phonetic", repeatable: true, fields: [{ name: "ipa", type: "text" }] },
  ];

  function buildContentType(kind: "collection" | "single" = "collection"): ContentTypeEntity {
    return new ContentTypeEntity("ct-1", "en-it-vocab", "EN-IT Vocab", kind, true, FIELDS, ["wordGroup"], new Date(), new Date());
  }

  function buildDeps(contentType: ContentTypeEntity) {
    const schemaResolver = { resolve: jest.fn().mockResolvedValue(contentType) } as unknown as jest.Mocked<SchemaResolverService>;
    const documents: jest.Mocked<IDocumentRepository> = {
      findByVersion: jest.fn(),
      upsert: jest.fn(),
      deleteAllVersions: jest.fn(),
      deleteVersion: jest.fn(),
      listPaginated: jest.fn().mockResolvedValue({ rows: [], total: 0 }),
      findManyByVersion: jest.fn().mockResolvedValue([]),
      findSingle: jest.fn(),
    };
    const componentIo = { hydrateComponents: jest.fn().mockResolvedValue({}) } as unknown as jest.Mocked<ComponentIoService>;

    return { schemaResolver, documents, componentIo };
  }

  const options: FullListOptions = { start: 0, size: 20, orderBy: "createdAt", sortDir: "desc", filters: [] };

  it("returns all published rows, fully hydrated with component data, no listFields projection", async () => {
    const contentType = buildContentType();
    const { schemaResolver, documents, componentIo } = buildDeps(contentType);

    const createdAt = new Date("2026-01-01T00:00:00.000Z");
    const updatedAt = new Date("2026-01-02T00:00:00.000Z");
    const publishedAt = new Date("2026-01-03T00:00:00.000Z");
    const row1 = new DocumentEntity("doc-1", "published", { wordGroup: "Networking" }, createdAt, updatedAt, publishedAt, null, null, null);
    const row2 = new DocumentEntity("doc-2", "published", { wordGroup: "Storage" }, createdAt, updatedAt, publishedAt, null, null, null);
    const row3 = new DocumentEntity("doc-3", "published", { wordGroup: "Compute" }, createdAt, updatedAt, publishedAt, null, null, null);
    documents.listPaginated.mockResolvedValue({ rows: [row1, row2, row3], total: 3 });
    componentIo.hydrateComponents.mockImplementation((_slug, documentId) => Promise.resolve({ phonetics: [{ ipa: `ipa-${documentId}` }] }));

    const service = new ListDocumentsFullService(schemaResolver, documents, componentIo);
    const result = await service.execute("en-it-vocab", options);

    expect(result.total).toBe(3);
    expect(result.items).toEqual([
      { documentId: "doc-1", wordGroup: "Networking", phonetics: [{ ipa: "ipa-doc-1" }], createdAt, updatedAt, publishedAt },
      { documentId: "doc-2", wordGroup: "Storage", phonetics: [{ ipa: "ipa-doc-2" }], createdAt, updatedAt, publishedAt },
      { documentId: "doc-3", wordGroup: "Compute", phonetics: [{ ipa: "ipa-doc-3" }], createdAt, updatedAt, publishedAt },
    ]);
  });

  it("always reads the published version, regardless of the content type's draftToPublish mode", async () => {
    const contentType = buildContentType();
    const { schemaResolver, documents, componentIo } = buildDeps(contentType);

    const service = new ListDocumentsFullService(schemaResolver, documents, componentIo);
    await service.execute("en-it-vocab", options);

    expect(documents.listPaginated).toHaveBeenCalledWith("en-it-vocab", "published", expect.anything(), contentType.fields);
  });

  it("passes start/size/orderBy/filters straight through to the repository", async () => {
    const contentType = buildContentType();
    const { schemaResolver, documents, componentIo } = buildDeps(contentType);

    const service = new ListDocumentsFullService(schemaResolver, documents, componentIo);
    const customOptions: FullListOptions = { start: 10, size: 5, orderBy: "wordGroup", sortDir: "asc", filters: [{ column: "wordGroup", operator: "$eq", value: "Networking" }] };
    await service.execute("en-it-vocab", customOptions);

    expect(documents.listPaginated).toHaveBeenCalledWith(
      "en-it-vocab",
      "published",
      expect.objectContaining({ start: 10, size: 5, orderBy: "wordGroup", sortDir: "asc", filters: customOptions.filters }),
      contentType.fields,
    );
  });

  it("passes filterTree straight through to the repository (SPEC.md §3.5 combinators)", async () => {
    const contentType = buildContentType();
    const { schemaResolver, documents, componentIo } = buildDeps(contentType);

    const service = new ListDocumentsFullService(schemaResolver, documents, componentIo);
    const customOptions: FullListOptions = { ...options, filterTree: { or: [{ column: "wordGroup", operator: "$eq", value: "Networking" }] } };
    await service.execute("en-it-vocab", customOptions);

    expect(documents.listPaginated).toHaveBeenCalledWith("en-it-vocab", "published", expect.objectContaining({ filterTree: customOptions.filterTree }), contentType.fields);
  });

  it("throws when the content type is single-kind", async () => {
    const contentType = buildContentType("single");
    const { schemaResolver, documents, componentIo } = buildDeps(contentType);

    const service = new ListDocumentsFullService(schemaResolver, documents, componentIo);

    await expect(service.execute("en-it-vocab", options)).rejects.toThrow(BadRequestException);
    expect(documents.listPaginated).not.toHaveBeenCalled();
  });
});
