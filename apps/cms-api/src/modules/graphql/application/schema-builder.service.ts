import { graphqlTypeFor } from "../domain/field-type-mapping";
import {
  componentInputTypeName,
  componentTypeName,
  createMutationName,
  deleteMutationName,
  filterTypeName,
  inputTypeName,
  listQueryName,
  orderByTypeName,
  publishMutationName,
  queryName,
  saveMutationName,
  typeName,
  unpublishMutationName,
  updateMutationName,
} from "../domain/naming";

import { Injectable } from "@nestjs/common";

import { SchemaLoaderService } from "@/modules/content-type/application/schema/schema-loader.service";
import { ContentTypeDefinition } from "@/modules/content-type/domain/entities/content-type.entity";
import { FieldDefinition, FieldType, LISTABLE_FIELD_TYPES } from "@/modules/content-type/domain/entities/field-definition";

const MEDIA_ASSET_TYPE = `type MediaAsset {
  documentId: ID!
  url: String!
  thumbnailUrl: String!
  fileName: String!
  width: Int!
  height: Int!
}`;

const JSON_SCALAR_TYPE = `scalar JSON`;

// Mirrors list-args.translator.ts's OPERATORS_BY_FIELD_TYPE (SPEC.md decision #7): the shared
// per-field-kind filter input types below must stay in lockstep with what that translator accepts.
const FILTER_INPUT_TYPE_BY_FIELD_TYPE: Partial<Record<FieldType, string>> = {
  text: "TextFilter",
  number: "NumberFilter",
  boolean: "BooleanFilter",
};

const SYSTEM_ORDER_BY_FIELDS = ["createdAt", "updatedAt", "publishedAt"];

const SHARED_FILTER_AND_ORDER_TYPES = `input TextFilter {
  eq: String
  ne: String
  contains: String
}

input NumberFilter {
  eq: Float
  ne: Float
  gt: Float
  gte: Float
  lt: Float
  lte: Float
}

input BooleanFilter {
  eq: Boolean
}

enum SortDirection {
  ASC
  DESC
}`;

function listableFields(fields: FieldDefinition[]): FieldDefinition[] {
  return fields.filter((field) => LISTABLE_FIELD_TYPES.has(field.type));
}

function buildFieldLine(contentTypeSlug: string, field: FieldDefinition): string {
  if (field.type === "component") {
    const nestedTypeName = componentTypeName(contentTypeSlug, field.component!);
    const type = field.repeatable ? `[${nestedTypeName}!]!` : nestedTypeName;
    return `  ${field.name}: ${type}`;
  }
  return `  ${field.name}: ${graphqlTypeFor(field)}`;
}

function buildObjectType(definition: ContentTypeDefinition): string {
  // documentId isn't a schema-defined field, but every resolver (query and mutation) already
  // attaches it (toResolverValue) — without it in the SDL, a client has no way to learn a newly
  // created document's id, since create<Type>'s caller doesn't know it up front.
  const fieldLines = ["  documentId: ID!", ...definition.fields.map((field) => buildFieldLine(definition.slug, field))];

  return `type ${typeName(definition.slug)} {\n${fieldLines.join("\n")}\n}`;
}

// Recurses through every component-typed field (arbitrary nesting depth) and emits one object
// type per unique <ContentType><Component> name encountered, in first-seen (deterministic) order.
function buildComponentTypesFor(definition: ContentTypeDefinition): string[] {
  const componentTypes: string[] = [];
  const seen = new Set<string>();

  function visit(fields: FieldDefinition[]): void {
    for (const field of fields) {
      if (field.type !== "component") {
        continue;
      }
      const name = componentTypeName(definition.slug, field.component!);
      if (seen.has(name)) {
        continue;
      }
      seen.add(name);
      const fieldLines = field.fields!.map((nestedField) => buildFieldLine(definition.slug, nestedField));
      componentTypes.push(`type ${name} {\n${fieldLines.join("\n")}\n}`);
      visit(field.fields!);
    }
  }

  visit(definition.fields);
  return componentTypes;
}

function buildInputFieldLine(contentTypeSlug: string, field: FieldDefinition): string {
  if (field.type === "component") {
    const nestedTypeName = componentInputTypeName(contentTypeSlug, field.component!);
    // Unlike the object type's [Type!]! (always a real, possibly-empty array), the list itself
    // stays nullable here: a mutation submits a partial <Type>Input, so a client omitting one
    // repeatable component must not be forced to submit every other one as an empty array too.
    const type = field.repeatable ? `[${nestedTypeName}!]` : nestedTypeName;
    return `  ${field.name}: ${type}`;
  }
  // Media fields are submitted as the target asset's document id, not a MediaAsset object
  // (GraphQL input types cannot reference an object output type).
  if (field.type === "media") {
    return `  ${field.name}: ID`;
  }
  return `  ${field.name}: ${graphqlTypeFor(field)}`;
}

function buildInputType(definition: ContentTypeDefinition): string {
  const fieldLines = definition.fields.map((field) => buildInputFieldLine(definition.slug, field));

  return `input ${inputTypeName(definition.slug)} {\n${fieldLines.join("\n")}\n}`;
}

// Mirrors buildComponentTypesFor's recursion, emitting the input-typed counterpart of each
// component type instead.
function buildComponentInputTypesFor(definition: ContentTypeDefinition): string[] {
  const componentInputTypes: string[] = [];
  const seen = new Set<string>();

  function visit(fields: FieldDefinition[]): void {
    for (const field of fields) {
      if (field.type !== "component") {
        continue;
      }
      const name = componentInputTypeName(definition.slug, field.component!);
      if (seen.has(name)) {
        continue;
      }
      seen.add(name);
      const fieldLines = field.fields!.map((nestedField) => buildInputFieldLine(definition.slug, nestedField));
      componentInputTypes.push(`input ${name} {\n${fieldLines.join("\n")}\n}`);
      visit(field.fields!);
    }
  }

  visit(definition.fields);
  return componentInputTypes;
}

function buildMutationFields(definition: ContentTypeDefinition): string[] {
  const type = typeName(definition.slug);
  const input = inputTypeName(definition.slug);

  return [
    `  ${createMutationName(definition.slug)}(data: ${input}!): ${type}!`,
    `  ${updateMutationName(definition.slug)}(documentId: ID!, data: ${input}!): ${type}!`,
    `  ${deleteMutationName(definition.slug)}(documentId: ID!): Boolean!`,
    `  ${publishMutationName(definition.slug)}(documentId: ID!): ${type}!`,
    `  ${unpublishMutationName(definition.slug)}(documentId: ID!): ${type}!`,
  ];
}

function buildFilterType(definition: ContentTypeDefinition): string {
  const fieldLines = listableFields(definition.fields).map((field) => `  ${field.name}: ${FILTER_INPUT_TYPE_BY_FIELD_TYPE[field.type]}`);

  return `input ${filterTypeName(definition.slug)} {\n${fieldLines.join("\n")}\n}`;
}

function buildOrderByType(definition: ContentTypeDefinition): string {
  const fieldNames = [...listableFields(definition.fields).map((field) => field.name), ...SYSTEM_ORDER_BY_FIELDS];
  const fieldLines = fieldNames.map((name) => `  ${name}: SortDirection`);

  return `input ${orderByTypeName(definition.slug)} {\n${fieldLines.join("\n")}\n}`;
}

function buildQueryField(definition: ContentTypeDefinition): string {
  const type = typeName(definition.slug);
  return `  ${queryName(definition.slug)}(documentId: ID!, status: String): ${type}`;
}

function buildListQueryField(definition: ContentTypeDefinition): string {
  const type = typeName(definition.slug);
  return `  ${listQueryName(definition.slug)}(where: ${filterTypeName(definition.slug)}, orderBy: ${orderByTypeName(definition.slug)}, start: Int, size: Int): [${type}!]!`;
}

function buildSingleQueryField(definition: ContentTypeDefinition): string {
  const type = typeName(definition.slug);
  return `  ${queryName(definition.slug)}(status: String): ${type}`;
}

function buildSingleTypeMutationFields(definition: ContentTypeDefinition): string[] {
  const type = typeName(definition.slug);
  const input = inputTypeName(definition.slug);

  return [
    `  ${saveMutationName(definition.slug)}(data: ${input}!): ${type}!`,
    `  ${publishMutationName(definition.slug)}: ${type}!`,
    `  ${unpublishMutationName(definition.slug)}: ${type}!`,
  ];
}

@Injectable()
export class SchemaBuilderService {
  constructor(private readonly schemaLoader: SchemaLoaderService) {}

  async buildTypeDefs(): Promise<string> {
    const definitions = await this.schemaLoader.load();
    const collectionDefinitions = definitions.filter((definition) => definition.kind === "collection");
    const singleDefinitions = definitions.filter((definition) => definition.kind === "single");

    const objectTypes = [...collectionDefinitions, ...singleDefinitions].flatMap((definition) => [buildObjectType(definition), ...buildComponentTypesFor(definition)]);
    const inputTypes = [...collectionDefinitions, ...singleDefinitions].flatMap((definition) => [buildInputType(definition), ...buildComponentInputTypesFor(definition)]);
    const filterTypes = collectionDefinitions.map(buildFilterType);
    const orderByTypes = collectionDefinitions.map(buildOrderByType);
    const queryFields = [
      "  _empty: String",
      ...collectionDefinitions.map(buildQueryField),
      ...collectionDefinitions.map(buildListQueryField),
      ...singleDefinitions.map(buildSingleQueryField),
    ];
    const queryType = `type Query {\n${queryFields.join("\n")}\n}`;
    const mutationFields = ["  _empty: String", ...collectionDefinitions.flatMap(buildMutationFields), ...singleDefinitions.flatMap(buildSingleTypeMutationFields)];
    const mutationType = `type Mutation {\n${mutationFields.join("\n")}\n}`;

    return [MEDIA_ASSET_TYPE, JSON_SCALAR_TYPE, ...objectTypes, ...inputTypes, SHARED_FILTER_AND_ORDER_TYPES, ...filterTypes, ...orderByTypes, queryType, mutationType].join(
      "\n\n",
    );
  }
}
