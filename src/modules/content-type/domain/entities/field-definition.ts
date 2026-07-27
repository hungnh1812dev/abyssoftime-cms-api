export type ContentKind = "single" | "collection";

export type FieldType = "text" | "richtext" | "number" | "boolean" | "media" | "json" | "component";

export interface FieldDefinition {
  name: string;
  type: FieldType;
  width?: string;
  header?: boolean;
  // component-only (present iff type === "component"):
  component?: string;
  repeatable?: boolean;
  fields?: FieldDefinition[];
}

export function isComponentField(field: FieldDefinition): boolean {
  return field.type === "component";
}
