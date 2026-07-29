import { queryName } from "../domain/naming";
import { isUUID } from "class-validator";
import { GraphQLError } from "graphql";

import { Injectable, NotFoundException } from "@nestjs/common";

import { SchemaLoaderService } from "@/modules/content-type/application/schema/schema-loader.service";
import { GetDocumentForEditService } from "@/modules/document/application/services/get-document-for-edit.service";
import { GetPublicDocumentService } from "@/modules/document/application/services/get-public-document.service";
import { DocumentEntity } from "@/modules/document/domain/entities/document.entity";

import { assertApiTokenPermission } from "./authorize.util";
import { type GraphqlContext } from "./graphql-context.factory";

interface SingleQueryArgs {
  Id: string;
  status?: string;
}

type QueryResolver = (parent: unknown, args: SingleQueryArgs, context: GraphqlContext, info: unknown) => Promise<Record<string, unknown> | null>;

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

@Injectable()
export class ResolverFactoryService {
  constructor(
    private readonly schemaLoader: SchemaLoaderService,
    private readonly getPublicDocument: GetPublicDocumentService,
    private readonly getDocumentForEdit: GetDocumentForEditService,
  ) {}

  async buildResolvers(): Promise<{ Query: Record<string, QueryResolver> }> {
    const definitions = await this.schemaLoader.load();
    const collectionDefinitions = definitions.filter((definition) => definition.kind === "collection");

    const query: Record<string, QueryResolver> = {};
    for (const definition of collectionDefinitions) {
      query[queryName(definition.slug)] = async (_parent, args, context) => {
        assertValidDocumentId(args.Id);

        if (args.status === "draft") {
          assertApiTokenPermission(context, "document:read");
          const result = await resolveOrNull(() => this.getDocumentForEdit.execute(definition.slug, args.Id));
          return result ? toResolverValue(result.document) : null;
        }

        const document = await resolveOrNull(() => this.getPublicDocument.execute(definition.slug, args.Id));
        return document ? toResolverValue(document) : null;
      };
    }

    return { Query: query };
  }
}
