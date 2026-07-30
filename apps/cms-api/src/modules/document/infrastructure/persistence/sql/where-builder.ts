import { quoteIdent } from "@/modules/content-type/application/schema/sql-identifier";
import { FieldDefinition, LISTABLE_FIELD_TYPES } from "@/modules/content-type/domain/entities/field-definition";
import { FilterOperator, ParsedFilter } from "@/modules/document/domain/entities/filter";

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

export type { FilterOperator, ParsedFilter };

const SQL_COMPARATOR_BY_OPERATOR: Record<Exclude<FilterOperator, "$contains">, string> = {
  $eq: "=",
  $ne: "<>",
  $gt: ">",
  $gte: ">=",
  $lt: "<",
  $lte: "<=",
};

export function buildFilterWhere(filters: ParsedFilter[], paramIndex: number): { sql: string; params: unknown[] } | null {
  if (filters.length === 0) {
    return null;
  }

  const clauses: string[] = [];
  const params: unknown[] = [];
  let index = paramIndex;

  for (const filter of filters) {
    const column = quoteIdent(filter.column);
    const placeholder = `$${index}`;
    if (filter.operator === "$contains") {
      clauses.push(`${column} ILIKE ${placeholder} ESCAPE '\\'`);
      params.push(`%${escapeSearchValue(String(filter.value))}%`);
    } else {
      clauses.push(`${column} ${SQL_COMPARATOR_BY_OPERATOR[filter.operator]} ${placeholder}`);
      params.push(filter.value);
    }
    index += 1;
  }

  return { sql: `(${clauses.join(" AND ")})`, params };
}

const SYSTEM_SORTABLE_COLUMNS = ["id", "document_id", "created_at", "updated_at", "published_at"];

export function sortableColumnsFor(fields: FieldDefinition[]): string[] {
  return [...SYSTEM_SORTABLE_COLUMNS, ...fields.filter((field) => LISTABLE_FIELD_TYPES.has(field.type)).map((field) => field.name)];
}
