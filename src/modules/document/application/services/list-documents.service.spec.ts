import { ContentTypeEntity } from "../../../content-type/domain/entities/content-type.entity";
import { DocumentEntity } from "../../domain/entities/document.entity";
import { IDocumentRepository } from "../../domain/repositories/document.repository";
import { SchemaResolverService } from "../support/schema-resolver.service";

import { BadRequestException } from "@nestjs/common";

import { FieldDefinition } from "@/modules/content-type/domain/entities/field-definition";

import { ListDocumentsService } from "./list-documents.service";

describe("ListDocumentsService", () => {
  const FIELDS: FieldDefinition[] = [
    { name: "wordGroup", type: "text" },
    { name: "bio", type: "richtext" },
  ];

  function buildContentType(draftToPublish: boolean): ContentTypeEntity {
    return new ContentTypeEntity("ct-1", "en-it-vocab", "EN-IT Vocab", "collection", draftToPublish, FIELDS, ["wordGroup"], new Date(), new Date());
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

    return { schemaResolver, documents };
  }

  it("lists draft rows and computes batch status from published rows in one extra query (mode A)", async () => {
    const contentType = buildContentType(true);
    const { schemaResolver, documents } = buildDeps(contentType);

    const draft1 = new DocumentEntity("doc-1", "draft", { wordGroup: "Networking", bio: "long text" }, new Date("2026-01-03"), new Date("2026-01-03"), null, null, null, null);
    const draft2 = new DocumentEntity("doc-2", "draft", { wordGroup: "Storage", bio: "long text" }, new Date("2026-01-01"), new Date("2026-01-01"), null, null, null, null);
    documents.listPaginated.mockResolvedValue({ rows: [draft1, draft2], total: 2 });

    const published1 = new DocumentEntity("doc-1", "published", {}, new Date("2026-01-01"), new Date("2026-01-01"), new Date("2026-01-01"), null, null, null);
    documents.findManyByVersion.mockResolvedValue([published1]);

    const service = new ListDocumentsService(schemaResolver, documents);
    const result = await service.execute("en-it-vocab", {});

    expect(documents.listPaginated).toHaveBeenCalledWith("en-it-vocab", "draft", expect.objectContaining({ start: 0, size: 20 }), contentType.fields);
    expect(documents.findManyByVersion).toHaveBeenCalledWith("en-it-vocab", ["doc-1", "doc-2"], "published", contentType.fields);

    expect(result.total).toBe(2);
    expect(result.start).toBe(0);
    expect(result.size).toBe(20);
    expect(result.items).toEqual([
      { documentId: "doc-1", data: { wordGroup: "Networking" }, status: "modified", createdAt: draft1.createdAt, updatedAt: draft1.updatedAt },
      { documentId: "doc-2", data: { wordGroup: "Storage" }, status: "draft", createdAt: draft2.createdAt, updatedAt: draft2.updatedAt },
    ]);
  });

  it("projects data to only the listFields, excluding fields not listed", async () => {
    const contentType = buildContentType(true);
    const { schemaResolver, documents } = buildDeps(contentType);
    const draft = new DocumentEntity("doc-1", "draft", { wordGroup: "Networking", bio: "long text" }, new Date(), new Date(), null, null, null, null);
    documents.listPaginated.mockResolvedValue({ rows: [draft], total: 1 });

    const service = new ListDocumentsService(schemaResolver, documents);
    const result = await service.execute("en-it-vocab", {});

    expect(result.items[0].data).toEqual({ wordGroup: "Networking" });
    expect(result.items[0].data).not.toHaveProperty("bio");
  });

  it("lists the single live row directly and skips the extra batch-status query (mode B)", async () => {
    const contentType = buildContentType(false);
    const { schemaResolver, documents } = buildDeps(contentType);
    const live = new DocumentEntity("doc-1", "published", { wordGroup: "Networking" }, new Date(), new Date(), new Date(), null, null, null);
    documents.listPaginated.mockResolvedValue({ rows: [live], total: 1 });

    const service = new ListDocumentsService(schemaResolver, documents);
    const result = await service.execute("en-it-vocab", {});

    expect(documents.listPaginated).toHaveBeenCalledWith("en-it-vocab", "published", expect.anything(), contentType.fields);
    expect(documents.findManyByVersion).not.toHaveBeenCalled();
    expect(result.items[0].status).toBe("published");
  });

  it("returns empty items without calling findManyByVersion when the page has no rows", async () => {
    const contentType = buildContentType(true);
    const { schemaResolver, documents } = buildDeps(contentType);

    const service = new ListDocumentsService(schemaResolver, documents);
    const result = await service.execute("en-it-vocab", {});

    expect(result.items).toEqual([]);
    expect(result.total).toBe(0);
  });

  it("propagates a 400 for an invalid query param before touching the repository", async () => {
    const contentType = buildContentType(true);
    const { schemaResolver, documents } = buildDeps(contentType);

    const service = new ListDocumentsService(schemaResolver, documents);

    await expect(service.execute("en-it-vocab", { size: "9999" })).rejects.toThrow(BadRequestException);
    expect(documents.listPaginated).not.toHaveBeenCalled();
  });
});
