import { FieldDefinition, FieldType } from "@/modules/content-type/domain/entities/field-definition";

type NonComponentFieldType = Exclude<FieldType, "component">;

const GRAPHQL_TYPE_BY_FIELD_TYPE: Record<NonComponentFieldType, string> = {
  text: "String",
  richtext: "String",
  number: "Float",
  boolean: "Boolean",
  media: "MediaAsset",
  json: "JSON",
};

export function graphqlTypeFor(field: FieldDefinition): string | null {
  if (field.type === "component") {
    return null;
  }
  return GRAPHQL_TYPE_BY_FIELD_TYPE[field.type];
}
