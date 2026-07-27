import { quoteIdent } from "@/modules/content-type/application/schema/sql-identifier";
import { FieldDefinition, FieldType } from "@/modules/content-type/domain/entities/field-definition";

export class InvalidOrderByFieldError extends Error {
  constructor(field: string) {
    super(`Invalid orderBy field: "${field}"`);
    this.name = "InvalidOrderByFieldError";
  }
}

export function buildOrderByClause(orderBy: string, sortDir: "asc" | "desc", allowedColumns: string[]): string {
  if (!allowedColumns.includes(orderBy)) {
    throw new InvalidOrderByFieldError(orderBy);
  }
  return `ORDER BY ${quoteIdent(orderBy)} ${sortDir === "asc" ? "ASC" : "DESC"}`;
}

export function escapeSearchValue(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/%/g, "\\%").replace(/_/g, "\\_");
}

export interface SearchWhereClause {
  sql: string;
  params: [string];
}

export function buildSearchWhere(search: string | undefined, searchableColumns: string[], paramIndex: number): SearchWhereClause | null {
  if (!search || searchableColumns.length === 0) {
    return null;
  }
  const placeholder = `$${paramIndex}`;
  const clause = searchableColumns.map((column) => `${quoteIdent(column)} ILIKE ${placeholder} ESCAPE '\\'`).join(" OR ");
  return { sql: `(${clause})`, params: [`%${escapeSearchValue(search)}%`] };
}

const SYSTEM_SORTABLE_COLUMNS = ["id", "document_id", "created_at", "updated_at", "published_at"];
const SORTABLE_FIELD_TYPES: ReadonlySet<FieldType> = new Set(["text", "number", "boolean"]);

export function sortableColumnsFor(fields: FieldDefinition[]): string[] {
  return [...SYSTEM_SORTABLE_COLUMNS, ...fields.filter((field) => SORTABLE_FIELD_TYPES.has(field.type)).map((field) => field.name)];
}
