import { GraphQLError } from "graphql";

import { FieldDefinition, FieldType, LISTABLE_FIELD_TYPES } from "@/modules/content-type/domain/entities/field-definition";
import { FullListOptions } from "@/modules/document/application/services/list-documents-full.service";
import { FilterNode, FilterOperator, ParsedFilter } from "@/modules/document/domain/entities/filter";
import { sortableColumnsFor } from "@/modules/document/infrastructure/persistence/sql/where-builder";

// Structural, not `ContentTypeEntity` — the graphql module's own resolver-factory only has
// `ContentTypeDefinition` (from `SchemaLoaderService.load()`) at resolver-build time, not a full
// DB-backed entity; both shapes satisfy this since only `.fields` is ever read.
type ContentTypeFields = { fields: FieldDefinition[] };

const DEFAULT_START = 0;
const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 100;
const UNLIMITED = -1;
const DEFAULT_SORT_DIR = "desc";

// SPEC.md decision #7 + SPEC.md §3.2 area 5: GraphQL v1 ships REST's operator set minus boolean
// `ne`, plus `in`/`notIn` on text/number (Go parity) — narrower than document's own
// filter-query.parser.ts, which allows `ne` on booleans too.
const OPERATORS_BY_FIELD_TYPE: Partial<Record<FieldType, readonly FilterOperator[]>> = {
  text: ["$eq", "$ne", "$contains", "$in", "$notIn"],
  number: ["$eq", "$ne", "$gt", "$gte", "$lt", "$lte", "$in", "$notIn"],
  boolean: ["$eq"],
};

const OPERATOR_ARG_TO_FILTER_OPERATOR: Record<string, FilterOperator> = {
  eq: "$eq",
  ne: "$ne",
  contains: "$contains",
  gt: "$gt",
  gte: "$gte",
  lt: "$lt",
  lte: "$lte",
  in: "$in",
  notIn: "$notIn",
};

// The sync engine names content-field columns after `field.name` verbatim (camelCase), but the
// fixed system columns are snake_case Postgres identifiers — this bridges the gap so GraphQL's
// orderBy stays camelCase-consistent with the rest of this API's naming.
const SYSTEM_ORDER_BY_ALIASES: Record<string, string> = {
  createdAt: "created_at",
  updatedAt: "updated_at",
  publishedAt: "published_at",
};

// SPEC.md §3.2 area 7: every <Type>Filter carries these 4 system-field filters (documentId:
// IDFilter, timestamps: TimeFilter) ahead of content fields — same snake_case column mapping as
// SYSTEM_ORDER_BY_ALIASES, plus documentId itself which orderBy doesn't need.
const SYSTEM_FILTER_FIELD_ALIASES: Record<string, string> = {
  documentId: "document_id",
  ...SYSTEM_ORDER_BY_ALIASES,
};

const SYSTEM_FILTER_OPERATORS: Record<string, readonly FilterOperator[]> = {
  documentId: ["$eq", "$ne", "$in", "$notIn"],
  createdAt: ["$eq", "$ne"],
  updatedAt: ["$eq", "$ne"],
  publishedAt: ["$eq", "$ne"],
};

// SPEC.md §3.4: default sort column is now the system createdAt column, not id.
const DEFAULT_ORDER_BY = SYSTEM_ORDER_BY_ALIASES.createdAt;

export interface PaginationInputArg {
  start?: number;
  limit?: number;
  page?: number;
  pageSize?: number;
}

// SPEC.md §3.5: a leaf entry maps a field name to its operator object (`{ eq: ... }`); `and`/`or`
// recurse into an array of nested `WhereInput`s, `not` into a single nested one.
export type WhereInput = Record<string, unknown>;

export interface ListArgsInput {
  where?: WhereInput;
  orderBy?: Record<string, "asc" | "desc">;
  pagination?: PaginationInputArg;
}

function badUserInput(message: string): GraphQLError {
  return new GraphQLError(message, { extensions: { code: "BAD_USER_INPUT" } });
}

// SPEC.md §3.3's 13-rule validation table, applied in this exact order.
function resolvePagination(pagination: PaginationInputArg | undefined): { start: number; size: number } {
  if (!pagination) {
    return { start: DEFAULT_START, size: DEFAULT_LIMIT };
  }

  const { start, limit, page, pageSize } = pagination;
  const offsetFieldSet = start !== undefined || limit !== undefined;
  const pageFieldSet = page !== undefined || pageSize !== undefined;

  if (offsetFieldSet && pageFieldSet) {
    throw badUserInput("cannot mix offset (start/limit) and page (page/pageSize) modes");
  }

  if (pageFieldSet) {
    if ((page === undefined) !== (pageSize === undefined)) {
      throw badUserInput("page and pageSize must both be provided");
    }
    if (page! < 1) {
      throw badUserInput("page must be >= 1");
    }
    if (pageSize === 0) {
      throw badUserInput("pageSize must not be 0");
    }
    const resolvedPageSize = Math.min(pageSize!, MAX_LIMIT);
    return { start: (page! - 1) * resolvedPageSize, size: resolvedPageSize };
  }

  const resolvedStart = start === undefined ? DEFAULT_START : Math.max(start, 0);

  if (limit === undefined) {
    return { start: resolvedStart, size: DEFAULT_LIMIT };
  }
  if (limit === 0) {
    throw badUserInput("limit must not be 0");
  }
  if (limit === UNLIMITED) {
    return { start: resolvedStart, size: UNLIMITED };
  }
  return { start: resolvedStart, size: Math.min(limit, MAX_LIMIT) };
}

function resolveOrderBy(orderBy: Record<string, "asc" | "desc"> | undefined, contentType: ContentTypeFields): { orderBy: string; sortDir: "asc" | "desc" } {
  const entries = Object.entries(orderBy ?? {});
  if (entries.length === 0) {
    return { orderBy: DEFAULT_ORDER_BY, sortDir: DEFAULT_SORT_DIR };
  }
  if (entries.length > 1) {
    throw badUserInput(`"orderBy" accepts exactly one field in v1, got ${entries.length}: ${entries.map(([field]) => field).join(", ")}`);
  }

  const [field, direction] = entries[0];
  const column = SYSTEM_ORDER_BY_ALIASES[field] ?? field;
  if (!sortableColumnsFor(contentType.fields).includes(column)) {
    throw badUserInput(`Invalid orderBy field: "${field}"`);
  }

  return { orderBy: column, sortDir: direction };
}

// Leaf-level resolution: one field's operator object (`{ eq: ..., in: ... }`) becomes one
// ParsedFilter per operator — reused by resolveFilterNode regardless of nesting depth.
function resolveFieldLeaves(field: string, operators: Record<string, unknown>, fieldTypeByName: Map<string, FieldType>): ParsedFilter[] {
  const systemColumn = SYSTEM_FILTER_FIELD_ALIASES[field];
  const fieldType = fieldTypeByName.get(field);
  if (!systemColumn && !fieldType) {
    throw badUserInput(`Invalid filter field: "${field}"`);
  }
  const legalOperators = systemColumn ? SYSTEM_FILTER_OPERATORS[field] : (OPERATORS_BY_FIELD_TYPE[fieldType!] ?? []);
  const resolvedColumn = systemColumn ?? field;

  const leaves: ParsedFilter[] = [];
  for (const [operatorArg, value] of Object.entries(operators)) {
    const operator = OPERATOR_ARG_TO_FILTER_OPERATOR[operatorArg];
    if (!operator || !legalOperators.includes(operator)) {
      throw badUserInput(`Operator "${operatorArg}" is not supported for filter field "${field}"`);
    }
    leaves.push({ column: resolvedColumn, operator, value: value as ParsedFilter["value"] });
  }
  return leaves;
}

// SPEC.md §3.5: `and`/`or` recurse into an array of nested WhereInputs, `not` into a single one;
// any other key is a leaf field condition. Every non-null entry at a level is implicitly ANDed —
// one code path handles both a plain field-only `where` and a combinator tree, always returning a
// single root FilterNode (or undefined for an empty/no-op object).
function resolveFilterNode(where: WhereInput, fieldTypeByName: Map<string, FieldType>): FilterNode | undefined {
  const nodes: FilterNode[] = [];

  for (const [key, value] of Object.entries(where)) {
    if (key === "and" || key === "or") {
      const children = (value as WhereInput[]).map((entry) => resolveFilterNode(entry, fieldTypeByName)).filter((node): node is FilterNode => node !== undefined);
      if (children.length > 0) {
        nodes.push({ [key]: children } as FilterNode);
      }
    } else if (key === "not") {
      const child = resolveFilterNode(value as WhereInput, fieldTypeByName);
      if (child) {
        nodes.push({ not: child });
      }
    } else {
      nodes.push(...resolveFieldLeaves(key, value as Record<string, unknown>, fieldTypeByName));
    }
  }

  if (nodes.length === 0) {
    return undefined;
  }
  return nodes.length === 1 ? nodes[0] : { and: nodes };
}

function resolveFilterTree(where: WhereInput | undefined, contentType: ContentTypeFields): FilterNode | undefined {
  if (!where) {
    return undefined;
  }
  const fieldTypeByName = new Map(contentType.fields.filter((field) => LISTABLE_FIELD_TYPES.has(field.type)).map((field) => [field.name, field.type]));
  return resolveFilterNode(where, fieldTypeByName);
}

export function translateListArgs(contentType: ContentTypeFields, args: ListArgsInput): FullListOptions {
  return {
    ...resolvePagination(args.pagination),
    ...resolveOrderBy(args.orderBy, contentType),
    filters: [],
    filterTree: resolveFilterTree(args.where, contentType),
  };
}
