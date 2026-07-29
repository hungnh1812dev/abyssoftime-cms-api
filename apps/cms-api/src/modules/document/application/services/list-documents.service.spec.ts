import { ContentTypeEntity } from "../../../content-type/domain/entities/content-type.entity";
import { DocumentEntity } from "../../domain/entities/document.entity";
import { IDocumentRepository } from "../../domain/repositories/document.repository";
import { SchemaResolverService } from "../support/schema-resolver.service";

import { BadRequestException } from "@nestjs/common";

import { FieldDefinition } from "@/modules/content-type/domain/entities/field-definition";
import { UserEntity } from "@/modules/users/domain/entities/user.entity";
import { IUserRepository } from "@/modules/users/domain/repositories/user.repository";

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
    const users: jest.Mocked<IUserRepository> = {
      findAll: jest.fn(),
      findById: jest.fn(),
      findByIds: jest.fn().mockResolvedValue([]),
      findByEmail: jest.fn(),
      findByUsername: jest.fn(),
      findByResetTokenHash: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
      hasAnyVerified: jest.fn(),
      completeVerification: jest.fn(),
    };

    return { schemaResolver, documents, users };
  }

  it("lists draft rows and computes batch status from published rows in one extra query (mode A)", async () => {
    const contentType = buildContentType(true);
    const { schemaResolver, documents, users } = buildDeps(contentType);

    const draft1 = new DocumentEntity("doc-1", "draft", { wordGroup: "Networking", bio: "long text" }, new Date("2026-01-03"), new Date("2026-01-03"), null, null, null, null);
    const draft2 = new DocumentEntity("doc-2", "draft", { wordGroup: "Storage", bio: "long text" }, new Date("2026-01-01"), new Date("2026-01-01"), null, null, null, null);
    documents.listPaginated.mockResolvedValue({ rows: [draft1, draft2], total: 2 });

    const published1 = new DocumentEntity("doc-1", "published", {}, new Date("2026-01-01"), new Date("2026-01-01"), new Date("2026-01-01"), null, null, null);
    documents.findManyByVersion.mockResolvedValue([published1]);

    const service = new ListDocumentsService(schemaResolver, documents, users);
    const result = await service.execute("en-it-vocab", {});

    expect(documents.listPaginated).toHaveBeenCalledWith("en-it-vocab", "draft", expect.objectContaining({ start: 0, size: 20 }), contentType.fields);
    expect(documents.findManyByVersion).toHaveBeenCalledWith("en-it-vocab", ["doc-1", "doc-2"], "published", contentType.fields);

    expect(result.total).toBe(2);
    expect(result.start).toBe(0);
    expect(result.size).toBe(20);
    expect(result.items).toEqual([
      { documentId: "doc-1", data: { wordGroup: "Networking" }, status: "modified", createdAt: draft1.createdAt, updatedAt: draft1.updatedAt, updatedBy: null },
      { documentId: "doc-2", data: { wordGroup: "Storage" }, status: "draft", createdAt: draft2.createdAt, updatedAt: draft2.updatedAt, updatedBy: null },
    ]);
  });

  it("includes each row's numeric id in the listed item", async () => {
    const contentType = buildContentType(true);
    const { schemaResolver, documents, users } = buildDeps(contentType);

    const draft1 = new DocumentEntity("doc-1", "draft", { wordGroup: "Networking", bio: "long text" }, new Date("2026-01-03"), new Date("2026-01-03"), null, null, null, null, 42);
    documents.listPaginated.mockResolvedValue({ rows: [draft1], total: 1 });

    const service = new ListDocumentsService(schemaResolver, documents, users);
    const result = await service.execute("en-it-vocab", {});

    expect(result.items[0].id).toBe(42);
  });

  it("projects data to only the listFields, excluding fields not listed", async () => {
    const contentType = buildContentType(true);
    const { schemaResolver, documents, users } = buildDeps(contentType);
    const draft = new DocumentEntity("doc-1", "draft", { wordGroup: "Networking", bio: "long text" }, new Date(), new Date(), null, null, null, null);
    documents.listPaginated.mockResolvedValue({ rows: [draft], total: 1 });

    const service = new ListDocumentsService(schemaResolver, documents, users);
    const result = await service.execute("en-it-vocab", {});

    expect(result.items[0].data).toEqual({ wordGroup: "Networking" });
    expect(result.items[0].data).not.toHaveProperty("bio");
  });

  it("lists the single live row directly and skips the extra batch-status query (mode B)", async () => {
    const contentType = buildContentType(false);
    const { schemaResolver, documents, users } = buildDeps(contentType);
    const live = new DocumentEntity("doc-1", "published", { wordGroup: "Networking" }, new Date(), new Date(), new Date(), null, null, null);
    documents.listPaginated.mockResolvedValue({ rows: [live], total: 1 });

    const service = new ListDocumentsService(schemaResolver, documents, users);
    const result = await service.execute("en-it-vocab", {});

    expect(documents.listPaginated).toHaveBeenCalledWith("en-it-vocab", "published", expect.anything(), contentType.fields);
    expect(documents.findManyByVersion).not.toHaveBeenCalled();
    expect(result.items[0].status).toBe("published");
  });

  it("returns empty items without calling findManyByVersion when the page has no rows", async () => {
    const contentType = buildContentType(true);
    const { schemaResolver, documents, users } = buildDeps(contentType);

    const service = new ListDocumentsService(schemaResolver, documents, users);
    const result = await service.execute("en-it-vocab", {});

    expect(result.items).toEqual([]);
    expect(result.total).toBe(0);
    expect(users.findByIds).toHaveBeenCalledTimes(1);
    expect(users.findByIds).toHaveBeenCalledWith([]);
  });

  it("propagates a 400 for an invalid query param before touching the repository", async () => {
    const contentType = buildContentType(true);
    const { schemaResolver, documents, users } = buildDeps(contentType);

    const service = new ListDocumentsService(schemaResolver, documents, users);

    await expect(service.execute("en-it-vocab", { size: "9999" })).rejects.toThrow(BadRequestException);
    expect(documents.listPaginated).not.toHaveBeenCalled();
  });

  describe("updatedBy resolution", () => {
    function updatedByUser(documentId: string, name: string): UserEntity {
      return new UserEntity(documentId, `${documentId}@example.com`, name, documentId, "hash", true, true, null, new Date(), new Date());
    }

    it("calls findByIds exactly once with the page's deduped, non-null updatedBy ids", async () => {
      const contentType = buildContentType(false);
      const { schemaResolver, documents, users } = buildDeps(contentType);
      const row1 = new DocumentEntity("doc-1", "published", { wordGroup: "A" }, new Date(), new Date(), new Date(), null, "user-1", null);
      const row2 = new DocumentEntity("doc-2", "published", { wordGroup: "B" }, new Date(), new Date(), new Date(), null, "user-1", null);
      const row3 = new DocumentEntity("doc-3", "published", { wordGroup: "C" }, new Date(), new Date(), new Date(), null, null, null);
      documents.listPaginated.mockResolvedValue({ rows: [row1, row2, row3], total: 3 });
      users.findByIds.mockResolvedValue([updatedByUser("user-1", "Jane Doe")]);

      const service = new ListDocumentsService(schemaResolver, documents, users);
      const result = await service.execute("en-it-vocab", {});

      expect(users.findByIds).toHaveBeenCalledTimes(1);
      expect(users.findByIds).toHaveBeenCalledWith(["user-1"]);
      expect(result.items[0].updatedBy).toEqual({ documentId: "user-1", name: "Jane Doe" });
      expect(result.items[1].updatedBy).toEqual({ documentId: "user-1", name: "Jane Doe" });
      expect(result.items[2].updatedBy).toBeNull();
    });

    it("resolves updatedBy to null for a dangling id (no matching user)", async () => {
      const contentType = buildContentType(false);
      const { schemaResolver, documents, users } = buildDeps(contentType);
      const row = new DocumentEntity("doc-1", "published", { wordGroup: "A" }, new Date(), new Date(), new Date(), null, "user-missing", null);
      documents.listPaginated.mockResolvedValue({ rows: [row], total: 1 });
      users.findByIds.mockResolvedValue([]);

      const service = new ListDocumentsService(schemaResolver, documents, users);
      const result = await service.execute("en-it-vocab", {});

      expect(result.items[0].updatedBy).toBeNull();
    });
  });

  describe("system columns in data (listFields)", () => {
    it("sources system-column listFields entries from resolved row values, not row.fields", async () => {
      const contentType = new ContentTypeEntity(
        "ct-1",
        "en-it-vocab",
        "EN-IT Vocab",
        "collection",
        false,
        FIELDS,
        ["wordGroup", "documentId", "status", "createdAt", "updatedAt", "publishedAt", "updatedBy"],
        new Date(),
        new Date(),
      );
      const { schemaResolver, documents, users } = buildDeps(contentType);
      const createdAt = new Date("2026-01-01");
      const updatedAt = new Date("2026-01-02");
      const publishedAt = new Date("2026-01-03");
      const row = new DocumentEntity("doc-1", "published", { wordGroup: "Networking" }, createdAt, updatedAt, publishedAt, null, "user-1", null);
      documents.listPaginated.mockResolvedValue({ rows: [row], total: 1 });
      const user = new UserEntity("user-1", "jane@example.com", "Jane Doe", "janedoe", "hash", true, true, null, new Date(), new Date());
      users.findByIds.mockResolvedValue([user]);

      const service = new ListDocumentsService(schemaResolver, documents, users);
      const result = await service.execute("en-it-vocab", {});

      expect(result.items[0].data).toEqual({
        wordGroup: "Networking",
        documentId: "doc-1",
        status: "published",
        createdAt,
        updatedAt,
        publishedAt,
        updatedBy: { documentId: "user-1", name: "Jane Doe" },
      });
    });
  });
});
