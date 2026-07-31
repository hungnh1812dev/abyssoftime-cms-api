import { DocumentEntity, DocumentVersion } from "../../domain/entities/document.entity";
import { IDocumentRepository, ListOptions } from "../../domain/repositories/document.repository";

import { Injectable } from "@nestjs/common";

import { quoteIdent } from "@/modules/content-type/application/schema/sql-identifier";
import { documentTableName } from "@/modules/content-type/application/schema/table-naming";
import { FieldDefinition, isComponentField } from "@/modules/content-type/domain/entities/field-definition";
import { Prisma } from "@/prisma/application/client";
import { PrismaService } from "@/prisma/application/prisma.service";

import { fieldsToRowValues, mapRowToDocument } from "./sql/row-mapper";
import { buildFilterWhere, buildOrderByClause, buildSearchWhere, sortableColumnsFor } from "./sql/where-builder";

@Injectable()
export class PrismaDocumentRepository implements IDocumentRepository {
  constructor(private readonly prisma: PrismaService) {}

  private client(tx?: Prisma.TransactionClient): PrismaService | Prisma.TransactionClient {
    return tx ?? this.prisma;
  }

  async findByVersion(slug: string, documentId: string, version: DocumentVersion, fields: FieldDefinition[]): Promise<DocumentEntity | null> {
    const table = quoteIdent(documentTableName(slug));
    const rows = await this.prisma.$queryRawUnsafe<Record<string, unknown>[]>(`SELECT * FROM ${table} WHERE document_id = $1 AND version = $2 LIMIT 1`, documentId, version);
    return rows.length > 0 ? mapRowToDocument(rows[0], fields) : null;
  }

  async findSingle(slug: string, version: DocumentVersion, fields: FieldDefinition[]): Promise<DocumentEntity | null> {
    const table = quoteIdent(documentTableName(slug));
    const rows = await this.prisma.$queryRawUnsafe<Record<string, unknown>[]>(`SELECT * FROM ${table} WHERE version = $1 ORDER BY id ASC LIMIT 1`, version);
    return rows.length > 0 ? mapRowToDocument(rows[0], fields) : null;
  }

  async findManyByVersion(slug: string, documentIds: string[], version: DocumentVersion, fields: FieldDefinition[]): Promise<DocumentEntity[]> {
    if (documentIds.length === 0) {
      return [];
    }
    const table = quoteIdent(documentTableName(slug));
    const rows = await this.prisma.$queryRawUnsafe<Record<string, unknown>[]>(`SELECT * FROM ${table} WHERE version = $1 AND document_id = ANY($2)`, version, documentIds);
    return rows.map((row) => mapRowToDocument(row, fields));
  }

  async upsert(slug: string, doc: DocumentEntity, fields: FieldDefinition[], tx?: Prisma.TransactionClient): Promise<void> {
    const table = quoteIdent(documentTableName(slug));
    const contentFields = fields.filter((field) => !isComponentField(field));
    const rowValues = fieldsToRowValues(doc.fields, fields);

    const contentColumns = contentFields.map((field) => quoteIdent(field.name));
    const columns = ["document_id", "version", ...contentColumns, "created_at", "updated_at", "published_at", "created_by", "updated_by", "published_by"];

    const values: unknown[] = [
      doc.documentId,
      doc.version,
      ...contentFields.map((field) => rowValues[field.name]),
      doc.createdAt,
      doc.updatedAt,
      doc.publishedAt,
      doc.createdBy,
      doc.updatedBy,
      doc.publishedBy,
    ];
    const placeholders = columns.map((_, index) => `$${index + 1}`);
    const updateSet = columns
      .filter((column) => column !== "document_id" && column !== "version")
      .map((column) => `${column} = EXCLUDED.${column}`)
      .join(", ");

    await this.client(tx).$executeRawUnsafe(
      `INSERT INTO ${table} (${columns.join(", ")}) VALUES (${placeholders.join(", ")}) ` + `ON CONFLICT (document_id, version) DO UPDATE SET ${updateSet}`,
      ...values,
    );
  }

  async deleteAllVersions(slug: string, documentId: string, tx?: Prisma.TransactionClient): Promise<void> {
    const table = quoteIdent(documentTableName(slug));
    await this.client(tx).$executeRawUnsafe(`DELETE FROM ${table} WHERE document_id = $1`, documentId);
  }

  async deleteVersion(slug: string, documentId: string, version: DocumentVersion, tx?: Prisma.TransactionClient): Promise<void> {
    const table = quoteIdent(documentTableName(slug));
    await this.client(tx).$executeRawUnsafe(`DELETE FROM ${table} WHERE document_id = $1 AND version = $2`, documentId, version);
  }

  async listPaginated(slug: string, version: DocumentVersion, opts: ListOptions, fields: FieldDefinition[]): Promise<{ rows: DocumentEntity[]; total: number }> {
    const table = quoteIdent(documentTableName(slug));

    const whereParams: unknown[] = [version];
    let whereSql = "version = $1";

    const search = buildSearchWhere(opts.search, opts.searchableFields, whereParams.length + 1);
    if (search) {
      whereSql += ` AND ${search.sql}`;
      whereParams.push(...search.params);
    }

    const filters = buildFilterWhere(opts.filters, whereParams.length + 1);
    if (filters) {
      whereSql += ` AND ${filters.sql}`;
      whereParams.push(...filters.params);
    }

    const orderByClause = buildOrderByClause(opts.orderBy, opts.sortDir, sortableColumnsFor(fields));

    const countRows = await this.prisma.$queryRawUnsafe<{ count: number }[]>(`SELECT COUNT(*) AS count FROM ${table} WHERE ${whereSql}`, ...whereParams);
    const total = Number(countRows[0]?.count ?? 0);

    // GraphQL's `limit: -1` (SPEC.md §3.3 rule 11) means "every matching row" — Postgres rejects
    // a negative LIMIT, so it's omitted entirely rather than passed through. REST's own
    // parseSize can never produce -1, so this branch is unreachable from REST.
    const dataRows =
      opts.size === -1
        ? await this.prisma.$queryRawUnsafe<Record<string, unknown>[]>(
            `SELECT * FROM ${table} WHERE ${whereSql} ${orderByClause} OFFSET $${whereParams.length + 1}`,
            ...whereParams,
            opts.start,
          )
        : await this.prisma.$queryRawUnsafe<Record<string, unknown>[]>(
            `SELECT * FROM ${table} WHERE ${whereSql} ${orderByClause} LIMIT $${whereParams.length + 1} OFFSET $${whereParams.length + 2}`,
            ...whereParams,
            opts.size,
            opts.start,
          );

    return { rows: dataRows.map((row) => mapRowToDocument(row, fields)), total };
  }
}
