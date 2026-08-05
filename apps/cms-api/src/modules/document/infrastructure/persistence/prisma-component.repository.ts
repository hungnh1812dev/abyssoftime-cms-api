import { ComponentEntity } from "../../domain/entities/component.entity";
import { DocumentVersion } from "../../domain/entities/document.entity";
import { IComponentRepository } from "../../domain/repositories/component.repository";

import { Injectable } from "@nestjs/common";

import { quoteIdent } from "@/modules/content-type/application/schema/sql-identifier";
import { componentTableName } from "@/modules/content-type/application/schema/table-naming";
import { FieldDefinition, isComponentField } from "@/modules/content-type/domain/entities/field-definition";
import { Prisma } from "@/prisma/application/client";
import { PrismaService } from "@/prisma/application/prisma.service";

import { fieldsToRowValues, mapRowToComponent } from "./sql/row-mapper";

@Injectable()
export class PrismaComponentRepository implements IComponentRepository {
  constructor(private readonly prisma: PrismaService) {}

  private client(tx?: Prisma.TransactionClient): PrismaService | Prisma.TransactionClient {
    return tx ?? this.prisma;
  }

  async findByDocument(slug: string, componentPath: string[], documentId: string, version: DocumentVersion, fields: FieldDefinition[]): Promise<ComponentEntity[]> {
    const table = quoteIdent(componentTableName(slug, componentPath));
    const rows = await this.prisma.$queryRawUnsafe<Record<string, unknown>[]>(
      `SELECT * FROM ${table} WHERE document_id = $1 AND version = $2 ORDER BY id ASC`,
      documentId,
      version,
    );
    return rows.map((row) => mapRowToComponent(row, fields));
  }

  async upsertAll(
    slug: string,
    componentPath: string[],
    documentId: string,
    version: DocumentVersion,
    parentComponentIds: (string | null)[],
    components: ComponentEntity[],
    fields: FieldDefinition[],
    tx?: Prisma.TransactionClient,
  ): Promise<void> {
    const table = quoteIdent(componentTableName(slug, componentPath));
    const client = this.client(tx);
    const isTopLevel = parentComponentIds.length === 1 && parentComponentIds[0] === null;

    if (isTopLevel) {
      await client.$executeRawUnsafe(`DELETE FROM ${table} WHERE document_id = $1 AND version = $2 AND parent_component_id IS NULL`, documentId, version);
    } else {
      await client.$executeRawUnsafe(
        `DELETE FROM ${table} WHERE document_id = $1 AND version = $2 AND parent_component_id = ANY($3::uuid[])`,
        documentId,
        version,
        parentComponentIds,
      );
    }

    if (components.length === 0) {
      return;
    }

    const contentFields = fields.filter((field) => !isComponentField(field));
    const contentColumns = contentFields.map((field) => quoteIdent(field.name));
    const columns = ["component_id", "document_id", "version", "parent_component_id", ...contentColumns];

    const values: unknown[] = [];
    const rowPlaceholders = components.map((component) => {
      const rowValues = fieldsToRowValues(component.fields, fields);
      const rowValuesList = [component.componentId, documentId, version, component.parentComponentId, ...contentFields.map((field) => rowValues[field.name])];
      const startIndex = values.length;
      values.push(...rowValuesList);
      return `(${rowValuesList.map((_, index) => `$${startIndex + index + 1}`).join(", ")})`;
    });

    await client.$executeRawUnsafe(`INSERT INTO ${table} (${columns.join(", ")}) VALUES ${rowPlaceholders.join(", ")}`, ...values);
  }

  async deleteByDocument(slug: string, componentPath: string[], documentId: string, version: DocumentVersion, tx?: Prisma.TransactionClient): Promise<void> {
    const table = quoteIdent(componentTableName(slug, componentPath));
    await this.client(tx).$executeRawUnsafe(`DELETE FROM ${table} WHERE document_id = $1 AND version = $2`, documentId, version);
  }
}
