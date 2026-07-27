import { ContentTypeEntity } from "../../../content-type/domain/entities/content-type.entity";

import { BadRequestException } from "@nestjs/common";

import { FieldType } from "@/modules/content-type/domain/entities/field-definition";
import { FilterOperator, ParsedFilter, sortableColumnsFor } from "@/modules/document/infrastructure/persistence/sql/where-builder";

export type FilterQueryParams = Record<string, Record<string, string>>;

type FilterValueClass = "text" | "number" | "boolean" | "id" | "opaque" | "timestamp";

const SYSTEM_COLUMN_CLASS: Partial<Record<string, FilterValueClass>> = {
  id: "id",
  document_id: "opaque",
  created_at: "timestamp",
  updated_at: "timestamp",
  published_at: "timestamp",
};

const FIELD_TYPE_CLASS: Partial<Record<FieldType, FilterValueClass>> = {
  text: "text",
  number: "number",
  boolean: "boolean",
};

const OPERATORS_BY_CLASS: Record<FilterValueClass, readonly FilterOperator[]> = {
  text: ["$eq", "$ne", "$contains"],
  number: ["$eq", "$ne", "$gt", "$gte", "$lt", "$lte"],
  boolean: ["$eq", "$ne"],
  id: ["$eq", "$ne"],
  opaque: ["$eq", "$ne"],
  timestamp: ["$eq", "$ne", "$gt", "$gte", "$lt", "$lte"],
};

const KNOWN_OPERATORS = new Set<FilterOperator>(["$eq", "$ne", "$contains", "$gt", "$gte", "$lt", "$lte"]);

export function parseFilters(contentType: ContentTypeEntity, rawFilters: FilterQueryParams | undefined): ParsedFilter[] {
  if (!rawFilters) {
    return [];
  }

  // Membership is decided solely by `sortableColumnsFor` (shared with orderBy) so this allowlist
  // never drifts from that one; this map only adds the value-class needed for operator legality.
  const allowedColumns = new Set(sortableColumnsFor(contentType.fields));
  const fieldTypeByName = new Map(contentType.fields.map((field) => [field.name, field.type]));

  return Object.entries(rawFilters).map(([column, operators]) => {
    if (!allowedColumns.has(column)) {
      throw new BadRequestException(`Invalid filter field: "${column}"`);
    }
    const valueClass = SYSTEM_COLUMN_CLASS[column] ?? FIELD_TYPE_CLASS[fieldTypeByName.get(column) as FieldType];
    if (!valueClass) {
      throw new BadRequestException(`Invalid filter field: "${column}"`);
    }

    const operatorEntries = Object.entries(operators ?? {});
    if (operatorEntries.length !== 1) {
      throw new BadRequestException(`Filter on "${column}" must specify exactly one operator`);
    }

    const [rawOperator, rawValue] = operatorEntries[0];
    if (!KNOWN_OPERATORS.has(rawOperator as FilterOperator)) {
      throw new BadRequestException(`Invalid filter operator: "${rawOperator}"`);
    }
    const operator = rawOperator as FilterOperator;
    if (!OPERATORS_BY_CLASS[valueClass].includes(operator)) {
      throw new BadRequestException(`Operator "${operator}" is not supported for filter field "${column}"`);
    }

    return { column, operator, value: coerceValue(valueClass, column, rawValue) };
  });
}

function coerceValue(valueClass: FilterValueClass, column: string, rawValue: string): string | number | boolean {
  switch (valueClass) {
    case "number":
    case "id": {
      const value = Number(rawValue);
      if (!Number.isFinite(value)) {
        throw new BadRequestException(`Invalid filter value for "${column}": "${rawValue}" is not a number`);
      }
      return value;
    }
    case "boolean": {
      if (rawValue !== "true" && rawValue !== "false") {
        throw new BadRequestException(`Invalid filter value for "${column}": must be "true" or "false"`);
      }
      return rawValue === "true";
    }
    case "timestamp": {
      if (Number.isNaN(Date.parse(rawValue))) {
        throw new BadRequestException(`Invalid filter value for "${column}": "${rawValue}" is not a valid date`);
      }
      return rawValue;
    }
    default:
      return rawValue;
  }
}
