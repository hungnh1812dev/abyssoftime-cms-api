import { FieldDefinition } from "../entities/field-definition";

export interface LiveColumn {
  name: string;
  dataType: string;
  isNullable: boolean;
}

export interface ColumnAdd {
  name: string;
  columnType: string;
}

export interface ColumnRetype {
  name: string;
  columnType: string;
}

export interface ColumnDiffPlan {
  addColumns: ColumnAdd[];
  dropColumns: string[];
  retypeColumns: ColumnRetype[];
}

export interface ISchemaTableRepository {
  ensureDocumentTable(slug: string, fields: FieldDefinition[]): Promise<void>;
  alterDocumentTable(slug: string, plan: ColumnDiffPlan): Promise<void>;
  dropDocumentTable(slug: string): Promise<void>;
  listDocumentColumns(slug: string): Promise<LiveColumn[]>;
  ensureComponentTable(slug: string, componentPath: string[], fields: FieldDefinition[]): Promise<void>;
  alterComponentTable(slug: string, componentPath: string[], plan: ColumnDiffPlan): Promise<void>;
  dropComponentTable(slug: string, componentPath: string[]): Promise<void>;
  listComponentColumns(slug: string, componentPath: string[]): Promise<LiveColumn[]>;
}

export const SCHEMA_TABLE_REPOSITORY = Symbol("SCHEMA_TABLE_REPOSITORY");
