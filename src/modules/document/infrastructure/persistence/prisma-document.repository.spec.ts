import { DocumentEntity } from "../../domain/entities/document.entity";
import { ListOptions } from "../../domain/repositories/document.repository";

import { FieldDefinition } from "@/modules/content-type/domain/entities/field-definition";
import { PrismaService } from "@/prisma/application/prisma.service";

import { PrismaDocumentRepository } from "./prisma-document.repository";

const FIELDS: FieldDefinition[] = [
  { name: "wordGroup", type: "text" },
  { name: "isMain", type: "boolean" },
  { name: "techStack", type: "json" },
  { name: "roles", type: "component", component: "role", repeatable: true, fields: [] },
];

describe("PrismaDocumentRepository", () => {
  let repository: PrismaDocumentRepository;
  let prisma: {
    $executeRawUnsafe: jest.Mock<Promise<number>, unknown[]>;
    $queryRawUnsafe: jest.Mock<Promise<unknown[]>, unknown[]>;
  };

  beforeEach(() => {
    prisma = {
      $executeRawUnsafe: jest.fn<Promise<number>, unknown[]>().mockResolvedValue(0),
      $queryRawUnsafe: jest.fn<Promise<unknown[]>, unknown[]>().mockResolvedValue([]),
    };

    repository = new PrismaDocumentRepository(prisma as unknown as PrismaService);
  });

  describe("findByVersion", () => {
    it("selects by document_id + version and maps the row", async () => {
      prisma.$queryRawUnsafe.mockResolvedValue([
        {
          document_id: "doc-1",
          version: "draft",
          wordGroup: "hi",
          isMain: true,
          techStack: null,
          created_at: new Date(),
          updated_at: new Date(),
          published_at: null,
          created_by: null,
          updated_by: null,
          published_by: null,
        },
      ]);

      const doc = await repository.findByVersion("en-it-vocab", "doc-1", "draft", FIELDS);

      expect(prisma.$queryRawUnsafe).toHaveBeenCalledWith(expect.stringContaining('FROM "documents_en_it_vocab"'), "doc-1", "draft");
      const [sql] = prisma.$queryRawUnsafe.mock.calls[0];
      expect(String(sql)).toContain("document_id = $1");
      expect(String(sql)).toContain("version = $2");
      expect(doc?.documentId).toBe("doc-1");
      expect(doc?.fields).toEqual({ wordGroup: "hi", isMain: true, techStack: null });
    });

    it("returns null when no row matches", async () => {
      prisma.$queryRawUnsafe.mockResolvedValue([]);

      const doc = await repository.findByVersion("en-it-vocab", "doc-1", "draft", FIELDS);

      expect(doc).toBeNull();
    });
  });

  describe("findSingle", () => {
    it("selects by version only, no document_id filter", async () => {
      prisma.$queryRawUnsafe.mockResolvedValue([]);

      await repository.findSingle("cv-page", "published", FIELDS);

      const [sql, ...params] = prisma.$queryRawUnsafe.mock.calls[0];
      expect(String(sql)).not.toContain("document_id");
      expect(String(sql)).toContain("version = $1");
      expect(params).toEqual(["published"]);
    });

    it("orders by id ASC — deterministic defense-in-depth in case more than one row ever exists for a single type", async () => {
      prisma.$queryRawUnsafe.mockResolvedValue([]);

      await repository.findSingle("cv-page", "published", FIELDS);

      const [sql] = prisma.$queryRawUnsafe.mock.calls[0];
      expect(String(sql)).toContain("ORDER BY id ASC");
    });
  });

  describe("findManyByVersion", () => {
    it("batches with document_id = ANY(...) and never issues N+1 queries", async () => {
      prisma.$queryRawUnsafe.mockResolvedValue([]);

      await repository.findManyByVersion("en-it-vocab", ["doc-1", "doc-2"], "published", FIELDS);

      expect(prisma.$queryRawUnsafe).toHaveBeenCalledTimes(1);
      const [sql, ...params] = prisma.$queryRawUnsafe.mock.calls[0];
      expect(String(sql)).toContain("= ANY($2");
      expect(params).toEqual(["published", ["doc-1", "doc-2"]]);
    });

    it("short-circuits without querying when documentIds is empty", async () => {
      const result = await repository.findManyByVersion("en-it-vocab", [], "published", FIELDS);

      expect(result).toEqual([]);
      expect(prisma.$queryRawUnsafe).not.toHaveBeenCalled();
    });
  });

  describe("upsert", () => {
    it("emits a parameterised INSERT ... ON CONFLICT with quoted content columns", async () => {
      const doc = new DocumentEntity(
        "doc-1",
        "draft",
        { wordGroup: "hi", isMain: true, techStack: { a: 1 } },
        new Date("2026-01-01T00:00:00Z"),
        new Date("2026-01-02T00:00:00Z"),
        null,
        "user-1",
        "user-1",
        null,
      );

      await repository.upsert("en-it-vocab", doc, FIELDS);

      expect(prisma.$executeRawUnsafe).toHaveBeenCalledTimes(1);
      const [sql, ...params] = prisma.$executeRawUnsafe.mock.calls[0];
      const stringSql = String(sql);

      expect(stringSql).toContain('INSERT INTO "documents_en_it_vocab"');
      expect(stringSql).toContain('"wordGroup"');
      expect(stringSql).toContain('"isMain"');
      expect(stringSql).toContain('"techStack"');
      expect(stringSql).not.toContain("roles");
      expect(stringSql).toContain("ON CONFLICT (document_id, version) DO UPDATE SET");
      expect(params).toEqual(["doc-1", "draft", "hi", true, JSON.stringify({ a: 1 }), doc.createdAt, doc.updatedAt, null, "user-1", "user-1", null]);
    });

    it("runs inside the given transaction client when provided", async () => {
      const doc = new DocumentEntity("doc-1", "draft", {}, new Date(), new Date(), null, null, null, null);
      const tx = { $executeRawUnsafe: jest.fn().mockResolvedValue(0) };

      await repository.upsert("cv-page", doc, [], tx as never);

      expect(tx.$executeRawUnsafe).toHaveBeenCalledTimes(1);
      expect(prisma.$executeRawUnsafe).not.toHaveBeenCalled();
    });
  });

  describe("deleteAllVersions", () => {
    it("deletes every row for the document_id", async () => {
      await repository.deleteAllVersions("cv-page", "doc-1");

      expect(prisma.$executeRawUnsafe).toHaveBeenCalledWith(expect.stringContaining('DELETE FROM "documents_cv_page"'), "doc-1");
      expect(String(prisma.$executeRawUnsafe.mock.calls[0][0])).toContain("document_id = $1");
    });

    it("runs inside the given transaction client when provided", async () => {
      const tx = { $executeRawUnsafe: jest.fn().mockResolvedValue(0) };

      await repository.deleteAllVersions("cv-page", "doc-1", tx as never);

      expect(tx.$executeRawUnsafe).toHaveBeenCalledTimes(1);
      expect(prisma.$executeRawUnsafe).not.toHaveBeenCalled();
    });
  });

  describe("deleteVersion", () => {
    it("deletes only the given (document_id, version) row", async () => {
      await repository.deleteVersion("cv-page", "doc-1", "published");

      const [sql, ...params] = prisma.$executeRawUnsafe.mock.calls[0];
      expect(String(sql)).toContain("document_id = $1");
      expect(String(sql)).toContain("version = $2");
      expect(params).toEqual(["doc-1", "published"]);
    });
  });

  describe("listPaginated", () => {
    const opts: ListOptions = {
      start: 0,
      size: 20,
      orderBy: "id",
      sortDir: "desc",
      listFields: ["wordGroup"],
      searchableFields: ["wordGroup"],
      filters: [],
    };

    it("runs a count query and a paginated data query scoped to the given version", async () => {
      prisma.$queryRawUnsafe.mockResolvedValueOnce([{ count: 2 }]).mockResolvedValueOnce([]);

      const { total } = await repository.listPaginated("en-it-vocab", "draft", opts, FIELDS);

      expect(total).toBe(2);
      expect(prisma.$queryRawUnsafe).toHaveBeenCalledTimes(2);

      const [countSql, ...countParams] = prisma.$queryRawUnsafe.mock.calls[0];
      expect(String(countSql)).toContain("SELECT COUNT(*)");
      expect(String(countSql)).toContain("version = $1");
      expect(countParams).toEqual(["draft"]);

      const [dataSql, ...dataParams] = prisma.$queryRawUnsafe.mock.calls[1];
      expect(String(dataSql)).toContain('ORDER BY "id" DESC');
      expect(String(dataSql)).toContain("LIMIT $2 OFFSET $3");
      expect(dataParams).toEqual(["draft", 20, 0]);
    });

    it("adds the search filter to both the count and data queries, sharing one placeholder", async () => {
      prisma.$queryRawUnsafe.mockResolvedValueOnce([{ count: 0 }]).mockResolvedValueOnce([]);

      await repository.listPaginated("en-it-vocab", "draft", { ...opts, search: "hello" }, FIELDS);

      const [countSql, ...countParams] = prisma.$queryRawUnsafe.mock.calls[0];
      expect(String(countSql)).toContain('"wordGroup" ILIKE $2');
      expect(countParams).toEqual(["draft", "%hello%"]);

      const [dataSql, ...dataParams] = prisma.$queryRawUnsafe.mock.calls[1];
      expect(String(dataSql)).toContain('"wordGroup" ILIKE $2');
      expect(String(dataSql)).toContain("LIMIT $3 OFFSET $4");
      expect(dataParams).toEqual(["draft", "%hello%", 20, 0]);
    });

    it("adds filters to both the count and data queries, AND'd with the version scope", async () => {
      prisma.$queryRawUnsafe.mockResolvedValueOnce([{ count: 0 }]).mockResolvedValueOnce([]);

      await repository.listPaginated("en-it-vocab", "draft", { ...opts, filters: [{ column: "wordGroup", operator: "$eq", value: "hello" }] }, FIELDS);

      const [countSql, ...countParams] = prisma.$queryRawUnsafe.mock.calls[0];
      expect(String(countSql)).toContain('("wordGroup" = $2)');
      expect(countParams).toEqual(["draft", "hello"]);

      const [dataSql, ...dataParams] = prisma.$queryRawUnsafe.mock.calls[1];
      expect(String(dataSql)).toContain('("wordGroup" = $2)');
      expect(String(dataSql)).toContain("LIMIT $3 OFFSET $4");
      expect(dataParams).toEqual(["draft", "hello", 20, 0]);
    });

    it("combines filters and search as an AND, each with its own placeholder", async () => {
      prisma.$queryRawUnsafe.mockResolvedValueOnce([{ count: 0 }]).mockResolvedValueOnce([]);

      await repository.listPaginated("en-it-vocab", "draft", { ...opts, search: "hi", filters: [{ column: "isMain", operator: "$eq", value: true }] }, FIELDS);

      const [countSql, ...countParams] = prisma.$queryRawUnsafe.mock.calls[0];
      expect(String(countSql)).toContain('"wordGroup" ILIKE $2');
      expect(String(countSql)).toContain('("isMain" = $3)');
      expect(countParams).toEqual(["draft", "%hi%", true]);
    });

    it("rejects an orderBy column outside the schema allowlist", async () => {
      await expect(repository.listPaginated("en-it-vocab", "draft", { ...opts, orderBy: "techStack" }, FIELDS)).rejects.toThrow();
    });

    it("maps rows through the row mapper", async () => {
      prisma.$queryRawUnsafe.mockResolvedValueOnce([{ count: 1 }]).mockResolvedValueOnce([
        {
          document_id: "doc-1",
          version: "draft",
          wordGroup: "hi",
          isMain: null,
          techStack: null,
          created_at: new Date(),
          updated_at: new Date(),
          published_at: null,
          created_by: null,
          updated_by: null,
          published_by: null,
        },
      ]);

      const { rows } = await repository.listPaginated("en-it-vocab", "draft", opts, FIELDS);

      expect(rows).toHaveLength(1);
      expect(rows[0].documentId).toBe("doc-1");
    });
  });
});
