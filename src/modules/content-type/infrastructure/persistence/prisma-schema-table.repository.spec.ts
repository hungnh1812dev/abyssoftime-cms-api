import { FieldDefinition } from "../../domain/entities/field-definition";
import { ColumnDiffPlan } from "../../domain/repositories/schema-table.repository";

import { PrismaService } from "@/prisma/application/prisma.service";

import { PrismaSchemaTableRepository } from "./prisma-schema-table.repository";

describe("PrismaSchemaTableRepository", () => {
  let repository: PrismaSchemaTableRepository;
  let prisma: {
    $executeRawUnsafe: jest.Mock<Promise<number>, unknown[]>;
    $queryRawUnsafe: jest.Mock<Promise<unknown[]>, unknown[]>;
  };

  beforeEach(() => {
    prisma = {
      $executeRawUnsafe: jest.fn<Promise<number>, unknown[]>().mockResolvedValue(0),
      $queryRawUnsafe: jest.fn<Promise<unknown[]>, unknown[]>().mockResolvedValue([]),
    };

    repository = new PrismaSchemaTableRepository(prisma as unknown as PrismaService);
  });

  describe("ensureDocumentTable", () => {
    it("emits a quoted CREATE TABLE IF NOT EXISTS with every identifier quoted and no unquoted interpolation", async () => {
      const fields: FieldDefinition[] = [
        { name: "wordGroup", type: "text" },
        { name: "isMain", type: "boolean" },
        { name: "experiences", type: "component", component: "experience", repeatable: true, fields: [] },
      ];

      await repository.ensureDocumentTable("en-it-vocab", fields);

      const createTableCall = prisma.$executeRawUnsafe.mock.calls.find((call) => String(call[0]).includes("CREATE TABLE"));
      expect(createTableCall).toBeDefined();
      const sql = String(createTableCall![0]);

      expect(sql).toContain('CREATE TABLE IF NOT EXISTS "documents_en_it_vocab"');
      expect(sql).toContain('"wordGroup" TEXT');
      expect(sql).toContain('"isMain" BOOLEAN');
      expect(sql).not.toContain("experiences");
      expect(sql).toContain("document_id UUID NOT NULL");
      expect(sql).toContain("version VARCHAR(20) NOT NULL");
      expect(sql).toContain("UNIQUE (document_id, version)");
      expect(createTableCall).toHaveLength(1);
    });

    it("creates a lookup index on document_id", async () => {
      await repository.ensureDocumentTable("cv-page", []);

      const indexCall = prisma.$executeRawUnsafe.mock.calls.find((call) => String(call[0]).includes("CREATE INDEX"));
      expect(indexCall).toBeDefined();
      expect(String(indexCall![0])).toContain('"documents_cv_page"');
      expect(String(indexCall![0])).toContain("(document_id)");
    });

    it("rejects an unsafe slug before touching the database", async () => {
      await expect(repository.ensureDocumentTable("bad slug", [])).rejects.toThrow();
      expect(prisma.$executeRawUnsafe).not.toHaveBeenCalled();
    });
  });

  describe("alterDocumentTable", () => {
    it("emits ADD/DROP/ALTER COLUMN clauses with quoted identifiers", async () => {
      const plan: ColumnDiffPlan = {
        addColumns: [{ name: "newField", columnType: "TEXT" }],
        dropColumns: ["oldField"],
        retypeColumns: [{ name: "teamSize", columnType: "TEXT" }],
      };

      await repository.alterDocumentTable("cv-page", plan);

      expect(prisma.$executeRawUnsafe).toHaveBeenCalledTimes(1);
      const sql = String(prisma.$executeRawUnsafe.mock.calls[0][0]);

      expect(sql).toContain('ALTER TABLE "documents_cv_page"');
      expect(sql).toContain('ADD COLUMN "newField" TEXT');
      expect(sql).toContain('DROP COLUMN "oldField"');
      expect(sql).toContain('ALTER COLUMN "teamSize" TYPE TEXT USING "teamSize"::TEXT');
    });

    it("does nothing when the plan is empty", async () => {
      const plan: ColumnDiffPlan = { addColumns: [], dropColumns: [], retypeColumns: [] };

      await repository.alterDocumentTable("cv-page", plan);

      expect(prisma.$executeRawUnsafe).not.toHaveBeenCalled();
    });
  });

  describe("dropDocumentTable", () => {
    it("emits a quoted DROP TABLE IF EXISTS", async () => {
      await repository.dropDocumentTable("cv-page");

      expect(prisma.$executeRawUnsafe).toHaveBeenCalledWith('DROP TABLE IF EXISTS "documents_cv_page" CASCADE;');
    });
  });

  describe("listDocumentColumns", () => {
    it("introspects information_schema.columns using a bound parameter, never interpolation", async () => {
      prisma.$queryRawUnsafe.mockResolvedValue([{ column_name: "wordGroup", data_type: "text", is_nullable: "YES" }]);

      const columns = await repository.listDocumentColumns("en-it-vocab");

      expect(prisma.$queryRawUnsafe).toHaveBeenCalledWith(expect.stringContaining("information_schema.columns"), "documents_en_it_vocab");
      const [sql] = prisma.$queryRawUnsafe.mock.calls[0];
      expect(String(sql)).not.toContain("en_it_vocab");
      expect(String(sql)).toContain("$1");
      expect(columns).toEqual([{ name: "wordGroup", dataType: "text", isNullable: true }]);
    });
  });

  describe("ensureComponentTable", () => {
    it("emits a quoted CREATE TABLE with component_id/parent_component_id and indexes", async () => {
      const fields: FieldDefinition[] = [{ name: "level", type: "text" }];

      await repository.ensureComponentTable("cv-page", ["experience", "role"], fields);

      const createTableCall = prisma.$executeRawUnsafe.mock.calls.find((call) => String(call[0]).includes("CREATE TABLE"));
      const sql = String(createTableCall![0]);

      expect(sql).toContain('CREATE TABLE IF NOT EXISTS "components_cv_page__experience_role"');
      expect(sql).toContain("component_id UUID NOT NULL");
      expect(sql).toContain("parent_component_id UUID");
      expect(sql).toContain('"level" TEXT');

      const indexCalls = prisma.$executeRawUnsafe.mock.calls.filter((call) => String(call[0]).includes("CREATE INDEX"));
      expect(indexCalls.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe("alterComponentTable", () => {
    it("emits ALTER TABLE against the component table name", async () => {
      const plan: ColumnDiffPlan = { addColumns: [{ name: "skill", columnType: "TEXT" }], dropColumns: [], retypeColumns: [] };

      await repository.alterComponentTable("cv-page", ["experience"], plan);

      const sql = String(prisma.$executeRawUnsafe.mock.calls[0][0]);
      expect(sql).toContain('ALTER TABLE "components_cv_page__experience"');
      expect(sql).toContain('ADD COLUMN "skill" TEXT');
    });
  });

  describe("dropComponentTable", () => {
    it("emits a quoted DROP TABLE IF EXISTS for the component table", async () => {
      await repository.dropComponentTable("cv-page", ["experience", "role"]);

      expect(prisma.$executeRawUnsafe).toHaveBeenCalledWith('DROP TABLE IF EXISTS "components_cv_page__experience_role" CASCADE;');
    });
  });

  describe("listComponentColumns", () => {
    it("introspects information_schema.columns for the component table using a bound parameter", async () => {
      prisma.$queryRawUnsafe.mockResolvedValue([{ column_name: "skill", data_type: "text", is_nullable: "NO" }]);

      const columns = await repository.listComponentColumns("cv-page", ["experience"]);

      expect(prisma.$queryRawUnsafe).toHaveBeenCalledWith(expect.stringContaining("information_schema.columns"), "components_cv_page__experience");
      expect(columns).toEqual([{ name: "skill", dataType: "text", isNullable: false }]);
    });
  });
});
