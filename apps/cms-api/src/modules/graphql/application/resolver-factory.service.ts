import { JSONScalar } from "../domain/json-scalar";
import { componentTypeName, listQueryName, queryName, typeName } from "../domain/naming";
import { isUUID } from "class-validator";
import { GraphQLError } from "graphql";

import { Injectable, NotFoundException } from "@nestjs/common";

import { SchemaLoaderService } from "@/modules/content-type/application/schema/schema-loader.service";
import { FieldDefinition } from "@/modules/content-type/domain/entities/field-definition";
import { GetDocumentForEditService } from "@/modules/document/application/services/get-document-for-edit.service";
import { GetPublicDocumentService } from "@/modules/document/application/services/get-public-document.service";
import { ListDocumentsFullService } from "@/modules/document/application/services/list-documents-full.service";
import { DocumentEntity } from "@/modules/document/domain/entities/document.entity";
import { MediaAssetEntity } from "@/modules/media/domain/entities/media-asset.entity";
import { type IMediaAssetRepository } from "@/modules/media/domain/repositories/media-asset.repository";

import { assertApiTokenPermission } from "./authorize.util";
import { type GraphqlContext } from "./graphql-context.factory";
import { type ListArgsInput, translateListArgs } from "./list-args.translator";

interface SingleQueryArgs {
  Id: string;
  status?: string;
}

type QueryResolver = (parent: unknown, args: SingleQueryArgs, context: GraphqlContext, info: unknown) => Promise<Record<string, unknown> | null>;
type ListQueryResolver = (parent: unknown, args: ListArgsInput, context: GraphqlContext, info: unknown) => Promise<Record<string, unknown>[]>;
type MediaFieldResolver = (parent: Record<string, unknown>) => Promise<MediaAssetEntity | null>;

function toResolverValue(document: DocumentEntity): Record<string, unknown> {
  return { documentId: document.documentId, ...document.fields };
}

function assertValidDocumentId(id: string): void {
  if (!isUUID(id, "4")) {
    throw new GraphQLError(`Invalid Id: "${id}" (must be a UUID v4)`, { extensions: { code: "BAD_USER_INPUT" } });
  }
}

async function resolveOrNull<T>(load: () => Promise<T>): Promise<T | null> {
  try {
    return await load();
  } catch (error) {
    if (error instanceof NotFoundException) {
      return null;
    }
    throw error;
  }
}

// Walks a content type's field tree (arbitrary component-nesting depth) and, for every type
// that has media-typed fields — the root object type or any nested component type — registers a
// field resolver hydrating that field's raw FK via MEDIA_ASSET_REPOSITORY.findByDocumentId.
function collectMediaFieldResolvers(
  ownerTypeName: string,
  contentTypeSlug: string,
  fields: FieldDefinition[],
  mediaAssets: IMediaAssetRepository,
  typeResolvers: Record<string, Record<string, MediaFieldResolver>>,
): void {
  const mediaFieldResolvers: Record<string, MediaFieldResolver> = {};

  for (const field of fields) {
    if (field.type === "media") {
      mediaFieldResolvers[field.name] = async (parent) => {
        const fk = parent[field.name];
        if (!fk || typeof fk !== "string") {
          return null;
        }
        return mediaAssets.findByDocumentId(fk);
      };
    } else if (field.type === "component") {
      const nestedTypeName = componentTypeName(contentTypeSlug, field.component!);
      collectMediaFieldResolvers(nestedTypeName, contentTypeSlug, field.fields!, mediaAssets, typeResolvers);
    }
  }

  if (Object.keys(mediaFieldResolvers).length > 0) {
    typeResolvers[ownerTypeName] = { ...typeResolvers[ownerTypeName], ...mediaFieldResolvers };
  }
}

@Injectable()
export class ResolverFactoryService {
  constructor(
    private readonly schemaLoader: SchemaLoaderService,
    private readonly getPublicDocument: GetPublicDocumentService,
    private readonly getDocumentForEdit: GetDocumentForEditService,
    private readonly listDocumentsFull: ListDocumentsFullService,
    private readonly mediaAssets: IMediaAssetRepository,
  ) {}

  async buildResolvers(): Promise<{
    Query: Record<string, QueryResolver | ListQueryResolver>;
    SortDirection: Record<string, string>;
    [typeName: string]: unknown;
  }> {
    const definitions = await this.schemaLoader.load();
    const collectionDefinitions = definitions.filter((definition) => definition.kind === "collection");

    const query: Record<string, QueryResolver | ListQueryResolver> = {};
    const typeResolvers: Record<string, Record<string, MediaFieldResolver>> = {};
    for (const definition of collectionDefinitions) {
      collectMediaFieldResolvers(typeName(definition.slug), definition.slug, definition.fields, this.mediaAssets, typeResolvers);

      query[queryName(definition.slug)] = async (_parent: unknown, args: SingleQueryArgs, context: GraphqlContext) => {
        assertValidDocumentId(args.Id);

        if (args.status === "draft") {
          assertApiTokenPermission(context, "document:read");
          const result = await resolveOrNull(() => this.getDocumentForEdit.execute(definition.slug, args.Id));
          return result ? toResolverValue(result.document) : null;
        }

        const document = await resolveOrNull(() => this.getPublicDocument.execute(definition.slug, args.Id));
        return document ? toResolverValue(document) : null;
      };

      query[listQueryName(definition.slug)] = async (_parent: unknown, args: ListArgsInput) => {
        const options = translateListArgs(definition, args);
        const result = await this.listDocumentsFull.execute(definition.slug, options);
        return result.items;
      };
    }

    return { Query: query, SortDirection: { ASC: "asc", DESC: "desc" }, JSON: JSONScalar, ...typeResolvers };
  }
}
