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

const DATE_TIME_SCALAR_TYPE = `scalar DateTime`;

// Mirrors list-args.translator.ts's OPERATORS_BY_FIELD_TYPE (SPEC.md decision #7): the shared
// per-field-kind filter input types below must stay in lockstep with what that translator accepts.
const FILTER_INPUT_TYPE_BY_FIELD_TYPE: Partial<Record<FieldType, string>> = {
  text: "TextFilter",
  number: "NumberFilter",
  boolean: "BooleanFilter",
};

const SYSTEM_ORDER_BY_FIELDS = ["id", "createdAt", "updatedAt", "publishedAt"];

const FILTER_INPUT_TYPES = `input TextFilter {
  eq: String
  ne: String
  contains: String
  in: [String!]
  notIn: [String!]
}

input NumberFilter {
  eq: Float
  ne: Float
  gt: Float
  gte: Float
  lt: Float
  lte: Float
  in: [Float!]
  notIn: [Float!]
}

input BooleanFilter {
  eq: Boolean
  ne: Boolean
}

input IDFilter {
  eq: ID
  ne: ID
  in: [ID!]
  notIn: [ID!]
}

input TimeFilter {
  eq: DateTime
  ne: DateTime
}`;

// SPEC.md §3.2: every <Type>Filter carries these 4 system-field filters ahead of its
// content-field entries, regardless of content type.
const SYSTEM_FILTER_FIELDS = ["  documentId: IDFilter", "  createdAt: TimeFilter", "  updatedAt: TimeFilter", "  publishedAt: TimeFilter"];

// Both cases are accepted as distinct enum values (not normalized) so a client can send either
// SortDirection: { ASC DESC asc desc } — resolver-factory.service.ts maps all four to "asc"/"desc".
const ORDER_BY_TYPES = `enum SortDirection {
  ASC
  DESC
  asc
  desc
}`;

const PAGINATION_TYPES = `input PaginationInput {
  start: Int
  limit: Int
  page: Int
  pageSize: Int
}

type PaginationMeta {
  page: Int!
  pageSize: Int!
  total: Int!
}

type ListMeta {
  pagination: PaginationMeta!
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
  const fieldLines = [
    "  documentId: ID!",
    // Auto-increment record id (BIGSERIAL), distinct from documentId (UUID). Only the list query
    // resolver populates it (ListDocumentsFullService reads it straight off the DB row); other
    // resolvers resolve it to null.
    "  id: Int",
    ...definition.fields.map((field) => buildFieldLine(definition.slug, field)),
    "  createdAt: DateTime!",
    "  updatedAt: DateTime!",
    "  publishedAt: DateTime",
  ];

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
  const name = filterTypeName(definition.slug);
  // SPEC.md §3.5: `and`/`or`/`not` are self-referencing so combinators nest to unbounded depth,
  // reached only through the existing `where` arg (no separate `filters:` array).
  const fieldLines = [
    ...SYSTEM_FILTER_FIELDS,
    ...listableFields(definition.fields).map((field) => `  ${field.name}: ${FILTER_INPUT_TYPE_BY_FIELD_TYPE[field.type]}`),
    `  and: [${name}!]`,
    `  or: [${name}!]`,
    `  not: ${name}`,
  ];

  return `input ${name} {\n${fieldLines.join("\n")}\n}`;
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

function listTypeName(slug: string): string {
  return `${typeName(slug)}List`;
}

function buildListType(definition: ContentTypeDefinition): string {
  const type = typeName(definition.slug);
  return `type ${listTypeName(definition.slug)} {\n  items: [${type}!]!\n  meta: ListMeta!\n}`;
}

function buildListQueryField(definition: ContentTypeDefinition): string {
  return `  ${listQueryName(definition.slug)}(where: ${filterTypeName(definition.slug)}, orderBy: ${orderByTypeName(definition.slug)}, pagination: PaginationInput): ${listTypeName(definition.slug)}!`;
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
    const listTypes = collectionDefinitions.map(buildListType);
    const queryFields = [
      "  _empty: String",
      ...collectionDefinitions.map(buildQueryField),
      ...collectionDefinitions.map(buildListQueryField),
      ...singleDefinitions.map(buildSingleQueryField),
    ];
    const queryType = `type Query {\n${queryFields.join("\n")}\n}`;
    const mutationFields = ["  _empty: String", ...collectionDefinitions.flatMap(buildMutationFields), ...singleDefinitions.flatMap(buildSingleTypeMutationFields)];
    const mutationType = `type Mutation {\n${mutationFields.join("\n")}\n}`;

    return [
      MEDIA_ASSET_TYPE,
      JSON_SCALAR_TYPE,
      DATE_TIME_SCALAR_TYPE,
      ...objectTypes,
      ...inputTypes,
      FILTER_INPUT_TYPES,
      ORDER_BY_TYPES,
      PAGINATION_TYPES,
      ...filterTypes,
      ...orderByTypes,
      ...listTypes,
      queryType,
      mutationType,
    ].join("\n\n");
  }
}
