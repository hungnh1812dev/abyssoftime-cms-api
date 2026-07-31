import { quoteIdent } from "@/modules/content-type/application/schema/sql-identifier";
import { FieldDefinition, LISTABLE_FIELD_TYPES } from "@/modules/content-type/domain/entities/field-definition";
import { FilterNode, FilterOperator, ParsedFilter } from "@/modules/document/domain/entities/filter";

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

const SQL_COMPARATOR_BY_OPERATOR: Record<Exclude<FilterOperator, "$contains" | "$in" | "$notIn">, string> = {
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
    } else if (filter.operator === "$in") {
      clauses.push(`${column} = ANY(${placeholder})`);
      params.push(filter.value);
    } else if (filter.operator === "$notIn") {
      clauses.push(`NOT (${column} = ANY(${placeholder}))`);
      params.push(filter.value);
    } else {
      clauses.push(`${column} ${SQL_COMPARATOR_BY_OPERATOR[filter.operator]} ${placeholder}`);
      params.push(filter.value);
    }
    index += 1;
  }

  return { sql: `(${clauses.join(" AND ")})`, params };
}

// New recursive/grouped SQL builder for SPEC.md §3.5's `and`/`or`/`not` combinators — additive
// alongside the existing flat `buildFilterWhere` above, which REST keeps using untouched. A leaf
// node's clause is bare (no wrapping parens); `and`/`or`/`not` groups parenthesize themselves, so
// nesting composes with correct precedence.
export function buildFilterTree(node: FilterNode, paramIndex: number): { sql: string; params: unknown[] } {
  const params: unknown[] = [];
  let index = paramIndex;

  function leafClause(filter: ParsedFilter): string {
    const column = quoteIdent(filter.column);
    const placeholder = `$${index}`;
    let clause: string;
    if (filter.operator === "$contains") {
      clause = `${column} ILIKE ${placeholder} ESCAPE '\\'`;
      params.push(`%${escapeSearchValue(String(filter.value))}%`);
    } else if (filter.operator === "$in") {
      clause = `${column} = ANY(${placeholder})`;
      params.push(filter.value);
    } else if (filter.operator === "$notIn") {
      clause = `NOT (${column} = ANY(${placeholder}))`;
      params.push(filter.value);
    } else {
      clause = `${column} ${SQL_COMPARATOR_BY_OPERATOR[filter.operator]} ${placeholder}`;
      params.push(filter.value);
    }
    index += 1;
    return clause;
  }

  function visit(n: FilterNode): string {
    if ("and" in n) {
      return `(${n.and.map(visit).join(" AND ")})`;
    }
    if ("or" in n) {
      return `(${n.or.map(visit).join(" OR ")})`;
    }
    if ("not" in n) {
      return `(NOT ${visit(n.not)})`;
    }
    return leafClause(n);
  }

  return { sql: visit(node), params };
}

const SYSTEM_SORTABLE_COLUMNS = ["id", "document_id", "created_at", "updated_at", "published_at"];

export function sortableColumnsFor(fields: FieldDefinition[]): string[] {
  return [...SYSTEM_SORTABLE_COLUMNS, ...fields.filter((field) => LISTABLE_FIELD_TYPES.has(field.type)).map((field) => field.name)];
}
