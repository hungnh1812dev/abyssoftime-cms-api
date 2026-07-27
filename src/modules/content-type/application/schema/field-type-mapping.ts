import { FieldDefinition, FieldType } from "../../domain/entities/field-definition";

type NonComponentFieldType = Exclude<FieldType, "component">;

const COLUMN_TYPE_BY_FIELD_TYPE: Record<NonComponentFieldType, string> = {
  text: "TEXT",
  richtext: "TEXT",
  number: "DOUBLE PRECISION",
  boolean: "BOOLEAN",
  media: "UUID REFERENCES media_assets(document_id) ON DELETE SET NULL",
  json: "JSONB",
};

export function columnTypeFor(field: FieldDefinition): string | null {
  if (field.type === "component") {
    return null;
  }
  return COLUMN_TYPE_BY_FIELD_TYPE[field.type];
}
