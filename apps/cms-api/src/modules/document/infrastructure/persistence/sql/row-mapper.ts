import { ComponentEntity } from "../../../domain/entities/component.entity";
import { DocumentEntity, DocumentVersion } from "../../../domain/entities/document.entity";

import { columnTypeFor } from "@/modules/content-type/application/schema/field-type-mapping";
import { FieldDefinition } from "@/modules/content-type/domain/entities/field-definition";

function isJsonColumn(field: FieldDefinition): boolean {
  return columnTypeFor(field) === "JSONB";
}

function extractRowFields(row: Record<string, unknown>, fields: FieldDefinition[]): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const field of fields) {
    if (field.type === "component") {
      continue;
    }
    const raw = row[field.name] ?? null;
    result[field.name] = isJsonColumn(field) && typeof raw === "string" ? JSON.parse(raw) : raw;
  }
  return result;
}

export function mapRowToDocument(row: Record<string, unknown>, fields: FieldDefinition[]): DocumentEntity {
  return new DocumentEntity(
    row.document_id as string,
    row.version as DocumentVersion,
    extractRowFields(row, fields),
    row.created_at as Date,
    row.updated_at as Date,
    (row.published_at as Date | null) ?? null,
    (row.created_by as string | null) ?? null,
    (row.updated_by as string | null) ?? null,
    (row.published_by as string | null) ?? null,
    // node-postgres parses BIGINT/BIGSERIAL as a string by default.
    Number(row.id),
  );
}

export function mapRowToComponent(row: Record<string, unknown>, fields: FieldDefinition[]): ComponentEntity {
  return new ComponentEntity(
    row.component_id as string,
    row.document_id as string,
    row.version as DocumentVersion,
    (row.parent_component_id as string | null) ?? null,
    extractRowFields(row, fields),
    {},
  );
}

export function fieldsToRowValues(data: Record<string, unknown>, fields: FieldDefinition[]): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const field of fields) {
    if (field.type === "component") {
      continue;
    }
    const value = data[field.name] ?? null;
    result[field.name] = isJsonColumn(field) && value !== null ? JSON.stringify(value) : value;
  }
  return result;
}
