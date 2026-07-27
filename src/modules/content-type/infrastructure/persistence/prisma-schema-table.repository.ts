import { columnTypeFor } from "../../application/schema/field-type-mapping";
import { quoteIdent } from "../../application/schema/sql-identifier";
import { componentTableName, documentTableName } from "../../application/schema/table-naming";
import { FieldDefinition, isComponentField } from "../../domain/entities/field-definition";
import { ColumnDiffPlan, ISchemaTableRepository, LiveColumn } from "../../domain/repositories/schema-table.repository";

import { Injectable } from "@nestjs/common";

import { PrismaService } from "@/prisma/application/prisma.service";

interface InformationSchemaColumnRow {
  column_name: string;
  data_type: string;
  is_nullable: string;
}

function nonComponentColumnsSql(fields: FieldDefinition[]): string {
  return fields
    .filter((field) => !isComponentField(field))
    .map((field) => `${quoteIdent(field.name)} ${columnTypeFor(field)}`)
    .join(",\n      ");
}

function castTargetType(columnType: string): string {
  return columnType.split(" REFERENCES")[0];
}

function buildAlterTableSql(quotedTableName: string, plan: ColumnDiffPlan): string | null {
  const clauses: string[] = [
    ...plan.addColumns.map((column) => `ADD COLUMN ${quoteIdent(column.name)} ${column.columnType}`),
    ...plan.dropColumns.map((name) => `DROP COLUMN ${quoteIdent(name)}`),
    ...plan.retypeColumns.map((column) => {
      const ident = quoteIdent(column.name);
      return `ALTER COLUMN ${ident} TYPE ${column.columnType} USING ${ident}::${castTargetType(column.columnType)}`;
    }),
  ];

  if (clauses.length === 0) {
    return null;
  }

  return `ALTER TABLE ${quotedTableName} ${clauses.join(", ")};`;
}

@Injectable()
export class PrismaSchemaTableRepository implements ISchemaTableRepository {
  constructor(private readonly prisma: PrismaService) {}

  async ensureDocumentTable(slug: string, fields: FieldDefinition[]): Promise<void> {
    const tableName = documentTableName(slug);
    const quotedTableName = quoteIdent(tableName);
    const contentColumnsSql = nonComponentColumnsSql(fields);
    const contentColumnsBlock = contentColumnsSql ? `${contentColumnsSql},\n      ` : "";

    await this.prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS ${quotedTableName} (
        id BIGSERIAL PRIMARY KEY,
        document_id UUID NOT NULL,
        version VARCHAR(20) NOT NULL,
        ${contentColumnsBlock}created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        published_at TIMESTAMPTZ,
        created_by UUID,
        updated_by UUID,
        published_by UUID,
        UNIQUE (document_id, version)
      );
    `);

    await this.prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS ${quoteIdent(`${tableName}_document_id_idx`)} ON ${quotedTableName} (document_id);`);
  }

  async alterDocumentTable(slug: string, plan: ColumnDiffPlan): Promise<void> {
    const sql = buildAlterTableSql(quoteIdent(documentTableName(slug)), plan);
    if (sql) {
      await this.prisma.$executeRawUnsafe(sql);
    }
  }

  async dropDocumentTable(slug: string): Promise<void> {
    await this.prisma.$executeRawUnsafe(`DROP TABLE IF EXISTS ${quoteIdent(documentTableName(slug))} CASCADE;`);
  }

  async listDocumentColumns(slug: string): Promise<LiveColumn[]> {
    return this.listColumnsForTable(documentTableName(slug));
  }

  async ensureComponentTable(slug: string, componentPath: string[], fields: FieldDefinition[]): Promise<void> {
    const tableName = componentTableName(slug, componentPath);
    const quotedTableName = quoteIdent(tableName);
    const contentColumnsSql = nonComponentColumnsSql(fields);
    const contentColumnsBlock = contentColumnsSql ? `${contentColumnsSql},\n      ` : "";

    await this.prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS ${quotedTableName} (
        id BIGSERIAL PRIMARY KEY,
        component_id UUID NOT NULL,
        document_id UUID NOT NULL,
        version VARCHAR(20) NOT NULL,
        parent_component_id UUID,
        ${contentColumnsBlock}created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `);

    await this.prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS ${quoteIdent(`${tableName}_document_version_idx`)} ON ${quotedTableName} (document_id, version);`);
    await this.prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS ${quoteIdent(`${tableName}_parent_idx`)} ON ${quotedTableName} (parent_component_id);`);
  }

  async alterComponentTable(slug: string, componentPath: string[], plan: ColumnDiffPlan): Promise<void> {
    const sql = buildAlterTableSql(quoteIdent(componentTableName(slug, componentPath)), plan);
    if (sql) {
      await this.prisma.$executeRawUnsafe(sql);
    }
  }

  async dropComponentTable(slug: string, componentPath: string[]): Promise<void> {
    await this.prisma.$executeRawUnsafe(`DROP TABLE IF EXISTS ${quoteIdent(componentTableName(slug, componentPath))} CASCADE;`);
  }

  async listComponentColumns(slug: string, componentPath: string[]): Promise<LiveColumn[]> {
    return this.listColumnsForTable(componentTableName(slug, componentPath));
  }

  private async listColumnsForTable(tableName: string): Promise<LiveColumn[]> {
    const rows = await this.prisma.$queryRawUnsafe<InformationSchemaColumnRow[]>(
      "SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_schema = current_schema() AND table_name = $1",
      tableName,
    );

    return rows.map((row) => ({
      name: row.column_name,
      dataType: row.data_type,
      isNullable: row.is_nullable === "YES",
    }));
  }
}
