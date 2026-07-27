import { FieldDefinition, isComponentField } from "../../domain/entities/field-definition";
import { ColumnAdd, ColumnDiffPlan, ColumnRetype, LiveColumn } from "../../domain/repositories/schema-table.repository";
import { columnTypeFor } from "../schema/field-type-mapping";
import { RESERVED_SYSTEM_FIELD_NAMES } from "../schema/schema-validator";

const RESERVED_COLUMN_NAMES: ReadonlySet<string> = new Set([...RESERVED_SYSTEM_FIELD_NAMES, "component_id", "parent_component_id"]);

export interface ComponentTableDiffPlan {
  addPaths: string[][];
  dropPaths: string[][];
}

function expectedLiveDataType(columnType: string): string {
  return columnType.split(" REFERENCES")[0].toLowerCase();
}

export function diffColumns(liveColumns: LiveColumn[], desiredFields: FieldDefinition[]): ColumnDiffPlan {
  const scalarFields = desiredFields.filter((field) => !isComponentField(field));
  const liveByName = new Map(liveColumns.map((column) => [column.name, column]));
  const desiredNames = new Set(scalarFields.map((field) => field.name));

  const addColumns: ColumnAdd[] = [];
  const dropColumns: string[] = [];
  const retypeColumns: ColumnRetype[] = [];

  for (const field of scalarFields) {
    const columnType = columnTypeFor(field);
    if (columnType === null) {
      continue;
    }

    const live = liveByName.get(field.name);
    if (!live) {
      addColumns.push({ name: field.name, columnType });
      continue;
    }

    const expectedType = expectedLiveDataType(columnType);
    if (live.dataType.toLowerCase() === expectedType) {
      continue;
    }

    if (expectedType === "text") {
      retypeColumns.push({ name: field.name, columnType });
    } else {
      dropColumns.push(field.name);
      addColumns.push({ name: field.name, columnType });
    }
  }

  for (const live of liveColumns) {
    if (RESERVED_COLUMN_NAMES.has(live.name)) {
      continue;
    }
    if (!desiredNames.has(live.name)) {
      dropColumns.push(live.name);
    }
  }

  return { addColumns, dropColumns, retypeColumns };
}

export function diffComponentTables(previousFields: FieldDefinition[], desiredFields: FieldDefinition[]): ComponentTableDiffPlan {
  const previousPaths = collectComponentPaths(previousFields);
  const desiredPaths = collectComponentPaths(desiredFields);

  const previousKeys = new Set(previousPaths.map(pathKey));
  const desiredKeys = new Set(desiredPaths.map(pathKey));

  return {
    addPaths: desiredPaths.filter((path) => !previousKeys.has(pathKey(path))),
    dropPaths: previousPaths.filter((path) => !desiredKeys.has(pathKey(path))),
  };
}

function pathKey(path: string[]): string {
  return path.join("/");
}

export function collectComponentPaths(fields: FieldDefinition[], prefix: string[] = []): string[][] {
  const paths: string[][] = [];

  for (const field of fields) {
    if (isComponentField(field) && field.component) {
      const path = [...prefix, field.component];
      paths.push(path);
      paths.push(...collectComponentPaths(field.fields ?? [], path));
    }
  }

  return paths;
}
