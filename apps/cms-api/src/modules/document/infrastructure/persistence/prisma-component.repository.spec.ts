import { ComponentEntity } from "../../domain/entities/component.entity";

import { FieldDefinition } from "@/modules/content-type/domain/entities/field-definition";
import { PrismaService } from "@/prisma/application/prisma.service";

import { PrismaComponentRepository } from "./prisma-component.repository";

const FIELDS: FieldDefinition[] = [
  { name: "level", type: "text" },
  { name: "skill", type: "text" },
];

describe("PrismaComponentRepository", () => {
  let repository: PrismaComponentRepository;
  let prisma: {
    $executeRawUnsafe: jest.Mock<Promise<number>, unknown[]>;
    $queryRawUnsafe: jest.Mock<Promise<unknown[]>, unknown[]>;
  };

  beforeEach(() => {
    prisma = {
      $executeRawUnsafe: jest.fn<Promise<number>, unknown[]>().mockResolvedValue(0),
      $queryRawUnsafe: jest.fn<Promise<unknown[]>, unknown[]>().mockResolvedValue([]),
    };

    repository = new PrismaComponentRepository(prisma as unknown as PrismaService);
  });

  describe("findByDocument", () => {
    it("selects by document_id + version, ordered by insertion order, and maps rows", async () => {
      prisma.$queryRawUnsafe.mockResolvedValue([{ component_id: "comp-1", document_id: "doc-1", version: "draft", parent_component_id: null, level: "senior", skill: "TS" }]);

      const rows = await repository.findByDocument("cv-page", ["experience"], "doc-1", "draft", FIELDS);

      expect(prisma.$queryRawUnsafe).toHaveBeenCalledWith(expect.stringContaining('FROM "components_cv_page__experience"'), "doc-1", "draft");
      const [sql] = prisma.$queryRawUnsafe.mock.calls[0];
      expect(String(sql)).toContain("document_id = $1");
      expect(String(sql)).toContain("version = $2");
      expect(String(sql)).toContain("ORDER BY id ASC");
      expect(rows).toHaveLength(1);
      expect(rows[0].componentId).toBe("comp-1");
      expect(rows[0].fields).toEqual({ level: "senior", skill: "TS" });
      expect(rows[0].children).toEqual({});
    });
  });

  describe("upsertAll", () => {
    it("deletes by IS NULL for the top-level ([null]) parent scope, then bulk-inserts using each entity's own parentComponentId", async () => {
      const components = [
        new ComponentEntity("comp-1", "doc-1", "draft", null, { level: "senior", skill: "TS" }, {}),
        new ComponentEntity("comp-2", "doc-1", "draft", null, { level: "junior", skill: "Go" }, {}),
      ];

      await repository.upsertAll("cv-page", ["experience"], "doc-1", "draft", [null], components, FIELDS);

      expect(prisma.$executeRawUnsafe).toHaveBeenCalledTimes(2);

      const [deleteSql, ...deleteParams] = prisma.$executeRawUnsafe.mock.calls[0];
      expect(String(deleteSql)).toContain('DELETE FROM "components_cv_page__experience"');
      expect(String(deleteSql)).toContain("parent_component_id IS NULL");
      expect(deleteParams).toEqual(["doc-1", "draft"]);

      const [insertSql, ...insertParams] = prisma.$executeRawUnsafe.mock.calls[1];
      expect(String(insertSql)).toContain('INSERT INTO "components_cv_page__experience"');
      expect(String(insertSql)).toContain('"level"');
      expect(String(insertSql)).toContain('"skill"');
      expect(insertParams).toEqual(["comp-1", "doc-1", "draft", null, "senior", "TS", "comp-2", "doc-1", "draft", null, "junior", "Go"]);
    });

    it("scopes the delete to ANY(...) of the given parentComponentIds for a nested level, and inserts each row with its own parentComponentId", async () => {
      const components = [
        new ComponentEntity("role-1", "doc-1", "draft", "exp-1", { level: "senior", skill: "TS" }, {}),
        new ComponentEntity("role-2", "doc-1", "draft", "exp-2", { level: "junior", skill: "Go" }, {}),
      ];

      await repository.upsertAll("cv-page", ["experience", "role"], "doc-1", "draft", ["exp-1", "exp-2"], components, FIELDS);

      const [deleteSql, ...deleteParams] = prisma.$executeRawUnsafe.mock.calls[0];
      expect(String(deleteSql)).toContain('DELETE FROM "components_cv_page__experience_role"');
      expect(String(deleteSql)).toContain("parent_component_id = ANY($3::uuid[])");
      expect(deleteParams).toEqual(["doc-1", "draft", ["exp-1", "exp-2"]]);

      const [, ...insertParams] = prisma.$executeRawUnsafe.mock.calls[1];
      expect(insertParams).toEqual(["role-1", "doc-1", "draft", "exp-1", "senior", "TS", "role-2", "doc-1", "draft", "exp-2", "junior", "Go"]);
    });

    it("does not issue an INSERT when the components array is empty, even with a non-empty parentComponentIds scope (pure delete)", async () => {
      await repository.upsertAll("cv-page", ["experience", "role"], "doc-1", "draft", ["exp-1"], [], FIELDS);

      expect(prisma.$executeRawUnsafe).toHaveBeenCalledTimes(1);
      const [deleteSql, ...deleteParams] = prisma.$executeRawUnsafe.mock.calls[0];
      expect(String(deleteSql)).toContain("parent_component_id = ANY($3::uuid[])");
      expect(deleteParams).toEqual(["doc-1", "draft", ["exp-1"]]);
    });

    it("runs both statements inside the given transaction client when provided", async () => {
      const tx = { $executeRawUnsafe: jest.fn().mockResolvedValue(0) };
      const components = [new ComponentEntity("comp-1", "doc-1", "draft", null, { level: "senior", skill: "TS" }, {})];

      await repository.upsertAll("cv-page", ["experience"], "doc-1", "draft", [null], components, FIELDS, tx as never);

      expect(tx.$executeRawUnsafe).toHaveBeenCalledTimes(2);
      expect(prisma.$executeRawUnsafe).not.toHaveBeenCalled();
    });
  });

  describe("deleteByDocument", () => {
    it("deletes every component row for the (document_id, version)", async () => {
      await repository.deleteByDocument("cv-page", ["experience"], "doc-1", "published");

      const [sql, ...params] = prisma.$executeRawUnsafe.mock.calls[0];
      expect(String(sql)).toContain('DELETE FROM "components_cv_page__experience"');
      expect(String(sql)).toContain("document_id = $1");
      expect(String(sql)).toContain("version = $2");
      expect(params).toEqual(["doc-1", "published"]);
    });

    it("runs inside the given transaction client when provided", async () => {
      const tx = { $executeRawUnsafe: jest.fn().mockResolvedValue(0) };

      await repository.deleteByDocument("cv-page", ["experience"], "doc-1", "published", tx as never);

      expect(tx.$executeRawUnsafe).toHaveBeenCalledTimes(1);
      expect(prisma.$executeRawUnsafe).not.toHaveBeenCalled();
    });
  });
});
