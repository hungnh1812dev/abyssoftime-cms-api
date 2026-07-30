import { GraphQLError } from "graphql";

import { FieldDefinition, FieldType, LISTABLE_FIELD_TYPES } from "@/modules/content-type/domain/entities/field-definition";
import { FullListOptions } from "@/modules/document/application/services/list-documents-full.service";
import { FilterOperator, ParsedFilter } from "@/modules/document/domain/entities/filter";
import { sortableColumnsFor } from "@/modules/document/infrastructure/persistence/sql/where-builder";

// Structural, not `ContentTypeEntity` — the graphql module's own resolver-factory only has
// `ContentTypeDefinition` (from `SchemaLoaderService.load()`) at resolver-build time, not a full
// DB-backed entity; both shapes satisfy this since only `.fields` is ever read.
type ContentTypeFields = { fields: FieldDefinition[] };

const DEFAULT_START = 0;
const DEFAULT_SIZE = 20;
const MAX_SIZE = 100;
const DEFAULT_ORDER_BY = "id";
const DEFAULT_SORT_DIR = "desc";

// SPEC.md decision #7: GraphQL v1 ships REST's operator set minus boolean `ne` — narrower than
// document's own filter-query.parser.ts, which allows `ne` on booleans too.
const OPERATORS_BY_FIELD_TYPE: Partial<Record<FieldType, readonly FilterOperator[]>> = {
  text: ["$eq", "$ne", "$contains"],
  number: ["$eq", "$ne", "$gt", "$gte", "$lt", "$lte"],
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
};

// The sync engine names content-field columns after `field.name` verbatim (camelCase), but the
// fixed system columns are snake_case Postgres identifiers — this bridges the gap so GraphQL's
// orderBy stays camelCase-consistent with the rest of this API's naming.
const SYSTEM_ORDER_BY_ALIASES: Record<string, string> = {
  createdAt: "created_at",
  updatedAt: "updated_at",
  publishedAt: "published_at",
};

export interface ListArgsInput {
  where?: Record<string, Record<string, unknown>>;
  orderBy?: Record<string, "asc" | "desc">;
  start?: number;
  size?: number;
}

function badUserInput(message: string): GraphQLError {
  return new GraphQLError(message, { extensions: { code: "BAD_USER_INPUT" } });
}

function resolveStart(start: number | undefined): number {
  if (start === undefined) {
    return DEFAULT_START;
  }
  if (!Number.isInteger(start) || start < 0) {
    throw badUserInput(`Invalid "start": ${start}`);
  }
  return start;
}

function resolveSize(size: number | undefined): number {
  if (size === undefined) {
    return DEFAULT_SIZE;
  }
  if (!Number.isInteger(size) || size < 1) {
    throw badUserInput(`Invalid "size": ${size}`);
  }
  return Math.min(size, MAX_SIZE);
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

function resolveFilters(where: Record<string, Record<string, unknown>> | undefined, contentType: ContentTypeFields): ParsedFilter[] {
  if (!where) {
    return [];
  }

  const fieldTypeByName = new Map(contentType.fields.filter((field) => LISTABLE_FIELD_TYPES.has(field.type)).map((field) => [field.name, field.type]));

  const filters: ParsedFilter[] = [];
  for (const [column, operators] of Object.entries(where)) {
    const fieldType = fieldTypeByName.get(column);
    if (!fieldType) {
      throw badUserInput(`Invalid filter field: "${column}"`);
    }
    const legalOperators = OPERATORS_BY_FIELD_TYPE[fieldType] ?? [];

    for (const [operatorArg, value] of Object.entries(operators)) {
      const operator = OPERATOR_ARG_TO_FILTER_OPERATOR[operatorArg];
      if (!operator || !legalOperators.includes(operator)) {
        throw badUserInput(`Operator "${operatorArg}" is not supported for filter field "${column}"`);
      }
      filters.push({ column, operator, value: value as string | number | boolean });
    }
  }

  return filters;
}

export function translateListArgs(contentType: ContentTypeFields, args: ListArgsInput): FullListOptions {
  return {
    start: resolveStart(args.start),
    size: resolveSize(args.size),
    ...resolveOrderBy(args.orderBy, contentType),
    filters: resolveFilters(args.where, contentType),
  };
}
