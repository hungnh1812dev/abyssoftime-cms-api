import { ContentTypeDefinition } from "../../domain/entities/content-type.entity";
import { FieldDefinition, isComponentField } from "../../domain/entities/field-definition";

import { assertSafeFieldName, assertSafeSlug } from "./sql-identifier";

export const RESERVED_SYSTEM_FIELD_NAMES: ReadonlySet<string> = new Set([
  "id",
  "document_id",
  "version",
  "created_at",
  "updated_at",
  "published_at",
  "created_by",
  "updated_by",
  "published_by",
  // camelCase forms baked into every generated GraphQL <Type>/<Type>Filter (schema-builder.service.ts):
  // a content field literally named one of these would emit a duplicate SDL field, which the GraphQL
  // module can't recover from at boot (Apollo rejects the whole typeDefs string, not just this content type).
  "documentId",
  "createdAt",
  "updatedAt",
  "publishedAt",
  "and",
  "or",
  "not",
]);

export class SchemaValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SchemaValidationError";
  }
}

export function validateContentTypeDefinition(definition: ContentTypeDefinition): void {
  assertSafeSlug(definition.slug);
  validateFields(definition.fields);

  const fieldNames = new Set(definition.fields.map((field) => field.name));
  for (const listField of definition.listFields ?? []) {
    if (!fieldNames.has(listField)) {
      throw new SchemaValidationError(`listFields references unknown field "${listField}" on content type "${definition.slug}"`);
    }
  }
}

function validateFields(fields: FieldDefinition[]): void {
  for (const field of fields) {
    assertSafeFieldName(field.name);
    if (RESERVED_SYSTEM_FIELD_NAMES.has(field.name)) {
      throw new SchemaValidationError(`Field name "${field.name}" is reserved for a system column`);
    }

    if (isComponentField(field)) {
      if (!field.component) {
        throw new SchemaValidationError(`Component field "${field.name}" is missing a "component" name`);
      }
      assertSafeFieldName(field.component);
      validateFields(field.fields ?? []);
    }
  }
}
