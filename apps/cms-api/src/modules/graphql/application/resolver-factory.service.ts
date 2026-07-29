import { JSONScalar } from "../domain/json-scalar";
import {
  componentTypeName,
  createMutationName,
  deleteMutationName,
  listQueryName,
  publishMutationName,
  queryName,
  saveMutationName,
  typeName,
  unpublishMutationName,
  updateMutationName,
} from "../domain/naming";
import { isUUID } from "class-validator";
import { GraphQLError } from "graphql";

import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";

import { SchemaLoaderService } from "@/modules/content-type/application/schema/schema-loader.service";
import { FieldDefinition } from "@/modules/content-type/domain/entities/field-definition";
import { DeleteDocumentService } from "@/modules/document/application/services/delete-document.service";
import { GetDocumentForEditService } from "@/modules/document/application/services/get-document-for-edit.service";
import { GetPublicDocumentService } from "@/modules/document/application/services/get-public-document.service";
import { GetPublicSingleTypeService } from "@/modules/document/application/services/get-public-single-type.service";
import { GetSingleTypeService } from "@/modules/document/application/services/get-single-type.service";
import { ListDocumentsFullService } from "@/modules/document/application/services/list-documents-full.service";
import { PublishDocumentService } from "@/modules/document/application/services/publish-document.service";
import { PublishSingleTypeService } from "@/modules/document/application/services/publish-single-type.service";
import { SaveDocumentService } from "@/modules/document/application/services/save-document.service";
import { SaveSingleTypeService } from "@/modules/document/application/services/save-single-type.service";
import { UnpublishDocumentService } from "@/modules/document/application/services/unpublish-document.service";
import { UnpublishSingleTypeService } from "@/modules/document/application/services/unpublish-single-type.service";
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

interface StatusOnlyArgs {
  status?: string;
}

interface CreateMutationArgs {
  data: Record<string, unknown>;
}

interface UpdateMutationArgs {
  Id: string;
  data: Record<string, unknown>;
}

interface IdMutationArgs {
  Id: string;
}

// Each Query/Mutation field has its own argument shape (SingleQueryArgs, ListArgsInput,
// CreateMutationArgs, ...); the field-resolver map itself is keyed by dynamically-generated
// field names, so — same as @nestjs/graphql's own IFieldResolver<any, any> — it can only be
// typed generically. Individual resolver closures below still declare (and get checked against)
// their own precise argument types.
type FieldResolver = (parent: unknown, args: any, context: GraphqlContext, info?: unknown) => Promise<unknown>;
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

// Mutations return a non-null <Type>!/Boolean!, so a missing document can't resolve to null the
// way queries do — it and a disabled draft/publish mode (Mode B) both surface as real GraphQL errors.
async function withMutationErrorMapping<T>(run: () => Promise<T>): Promise<T> {
  try {
    return await run();
  } catch (error) {
    if (error instanceof NotFoundException) {
      throw new GraphQLError(error.message, { extensions: { code: "NOT_FOUND" } });
    }
    if (error instanceof BadRequestException) {
      throw new GraphQLError(error.message, { extensions: { code: "BAD_USER_INPUT" } });
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
    private readonly saveDocument: SaveDocumentService,
    private readonly publishDocument: PublishDocumentService,
    private readonly unpublishDocument: UnpublishDocumentService,
    private readonly deleteDocument: DeleteDocumentService,
    private readonly getPublicSingleType: GetPublicSingleTypeService,
    private readonly getSingleType: GetSingleTypeService,
    private readonly saveSingleType: SaveSingleTypeService,
    private readonly publishSingleType: PublishSingleTypeService,
    private readonly unpublishSingleType: UnpublishSingleTypeService,
  ) {}

  async buildResolvers(): Promise<{
    Query: Record<string, FieldResolver>;
    Mutation: Record<string, FieldResolver>;
    SortDirection: Record<string, string>;
    [typeName: string]: unknown;
  }> {
    const definitions = await this.schemaLoader.load();
    const collectionDefinitions = definitions.filter((definition) => definition.kind === "collection");
    const singleDefinitions = definitions.filter((definition) => definition.kind === "single");

    const query: Record<string, FieldResolver> = {};
    const mutation: Record<string, FieldResolver> = {};
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

      mutation[createMutationName(definition.slug)] = async (_parent: unknown, args: CreateMutationArgs, context: GraphqlContext) => {
        assertApiTokenPermission(context, "document:create");
        const document = await withMutationErrorMapping(() => this.saveDocument.execute(definition.slug, args.data, undefined, context.apiToken!.documentId));
        return toResolverValue(document);
      };

      mutation[updateMutationName(definition.slug)] = async (_parent: unknown, args: UpdateMutationArgs, context: GraphqlContext) => {
        assertValidDocumentId(args.Id);
        assertApiTokenPermission(context, "document:update");
        await withMutationErrorMapping(() => this.saveDocument.execute(definition.slug, args.data, args.Id, context.apiToken!.documentId));
        const result = await withMutationErrorMapping(() => this.getDocumentForEdit.execute(definition.slug, args.Id));
        return toResolverValue(result.document);
      };

      mutation[deleteMutationName(definition.slug)] = async (_parent: unknown, args: IdMutationArgs, context: GraphqlContext) => {
        assertValidDocumentId(args.Id);
        assertApiTokenPermission(context, "document:delete");
        await withMutationErrorMapping(() => this.deleteDocument.execute(definition.slug, args.Id));
        return true;
      };

      mutation[publishMutationName(definition.slug)] = async (_parent: unknown, args: IdMutationArgs, context: GraphqlContext) => {
        assertValidDocumentId(args.Id);
        assertApiTokenPermission(context, "document:publish");
        const published = await withMutationErrorMapping(() => this.publishDocument.execute(definition.slug, args.Id, context.apiToken!.documentId));
        return toResolverValue(published);
      };

      mutation[unpublishMutationName(definition.slug)] = async (_parent: unknown, args: IdMutationArgs, context: GraphqlContext) => {
        assertValidDocumentId(args.Id);
        assertApiTokenPermission(context, "document:unpublish");
        await withMutationErrorMapping(() => this.unpublishDocument.execute(definition.slug, args.Id));
        const result = await withMutationErrorMapping(() => this.getDocumentForEdit.execute(definition.slug, args.Id));
        return toResolverValue(result.document);
      };
    }

    for (const definition of singleDefinitions) {
      collectMediaFieldResolvers(typeName(definition.slug), definition.slug, definition.fields, this.mediaAssets, typeResolvers);

      query[queryName(definition.slug)] = async (_parent: unknown, args: StatusOnlyArgs, context: GraphqlContext) => {
        if (args.status === "draft") {
          assertApiTokenPermission(context, "document:read");
          const result = await resolveOrNull(() => this.getSingleType.execute(definition.slug));
          return result ? toResolverValue(result.document) : null;
        }

        const document = await resolveOrNull(() => this.getPublicSingleType.execute(definition.slug));
        return document ? toResolverValue(document) : null;
      };

      mutation[saveMutationName(definition.slug)] = async (_parent: unknown, args: CreateMutationArgs, context: GraphqlContext) => {
        assertApiTokenPermission(context, "document:update");
        await withMutationErrorMapping(() => this.saveSingleType.execute(definition.slug, args.data, context.apiToken!.documentId));
        const result = await withMutationErrorMapping(() => this.getSingleType.execute(definition.slug));
        return toResolverValue(result.document);
      };

      mutation[publishMutationName(definition.slug)] = async (_parent: unknown, _args: Record<string, never>, context: GraphqlContext) => {
        assertApiTokenPermission(context, "document:publish");
        const published = await withMutationErrorMapping(() => this.publishSingleType.execute(definition.slug, context.apiToken!.documentId));
        return toResolverValue(published);
      };

      mutation[unpublishMutationName(definition.slug)] = async (_parent: unknown, _args: Record<string, never>, context: GraphqlContext) => {
        assertApiTokenPermission(context, "document:unpublish");
        await withMutationErrorMapping(() => this.unpublishSingleType.execute(definition.slug));
        const result = await withMutationErrorMapping(() => this.getSingleType.execute(definition.slug));
        return toResolverValue(result.document);
      };
    }

    return { Query: query, Mutation: mutation, SortDirection: { ASC: "asc", DESC: "desc" }, JSON: JSONScalar, ...typeResolvers };
  }
}
