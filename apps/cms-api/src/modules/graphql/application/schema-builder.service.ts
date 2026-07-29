import { graphqlTypeFor } from "../domain/field-type-mapping";
import { queryName, typeName } from "../domain/naming";

import { Injectable } from "@nestjs/common";

import { SchemaLoaderService } from "@/modules/content-type/application/schema/schema-loader.service";
import { ContentTypeDefinition } from "@/modules/content-type/domain/entities/content-type.entity";
import { FieldDefinition } from "@/modules/content-type/domain/entities/field-definition";

const SCALAR_FIELD_TYPES = new Set<FieldDefinition["type"]>(["text", "richtext", "number", "boolean", "json"]);

function buildObjectType(definition: ContentTypeDefinition): string {
  const fieldLines = definition.fields.filter((field) => SCALAR_FIELD_TYPES.has(field.type)).map((field) => `  ${field.name}: ${graphqlTypeFor(field)}`);

  return `type ${typeName(definition.slug)} {\n${fieldLines.join("\n")}\n}`;
}

function buildQueryField(definition: ContentTypeDefinition): string {
  return `  ${queryName(definition.slug)}(Id: ID!, status: String): ${typeName(definition.slug)}`;
}

@Injectable()
export class SchemaBuilderService {
  constructor(private readonly schemaLoader: SchemaLoaderService) {}

  async buildTypeDefs(): Promise<string> {
    const definitions = await this.schemaLoader.load();
    const collectionDefinitions = definitions.filter((definition) => definition.kind === "collection");

    const objectTypes = collectionDefinitions.map(buildObjectType);
    const queryFields = ["  _empty: String", ...collectionDefinitions.map(buildQueryField)];
    const queryType = `type Query {\n${queryFields.join("\n")}\n}`;

    return [...objectTypes, queryType].join("\n\n");
  }
}
