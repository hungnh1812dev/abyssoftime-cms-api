import { type Request } from "express";

import { ApolloDriver, ApolloDriverConfig } from "@nestjs/apollo";
import { Module } from "@nestjs/common";
import { GraphQLModule as NestGraphQLModule } from "@nestjs/graphql";

import { AccessTokenModule } from "@/modules/access-tokens/access-token.module";
import { ACCESS_TOKEN_REPOSITORY, type IAccessTokenRepository } from "@/modules/access-tokens/domain/repositories/access-token.repository";
import { SchemaLoaderService } from "@/modules/content-type/application/schema/schema-loader.service";
import { ContentTypeModule } from "@/modules/content-type/content-type.module";
import { GetDocumentForEditService } from "@/modules/document/application/services/get-document-for-edit.service";
import { GetPublicDocumentService } from "@/modules/document/application/services/get-public-document.service";
import { ListDocumentsFullService } from "@/modules/document/application/services/list-documents-full.service";
import { DocumentModule } from "@/modules/document/document.module";

import { GraphqlContextFactory } from "./application/graphql-context.factory";
import { ResolverFactoryService } from "./application/resolver-factory.service";
import { SchemaBuilderService } from "./application/schema-builder.service";

@Module({
  imports: [
    NestGraphQLModule.forRootAsync<ApolloDriverConfig>({
      imports: [ContentTypeModule, DocumentModule, AccessTokenModule],
      driver: ApolloDriver,
      inject: [SchemaLoaderService, GetPublicDocumentService, GetDocumentForEditService, ListDocumentsFullService, ACCESS_TOKEN_REPOSITORY],
      useFactory: async (
        schemaLoader: SchemaLoaderService,
        getPublicDocument: GetPublicDocumentService,
        getDocumentForEdit: GetDocumentForEditService,
        listDocumentsFull: ListDocumentsFullService,
        accessTokens: IAccessTokenRepository,
      ) => {
        const schemaBuilder = new SchemaBuilderService(schemaLoader);
        const resolverFactory = new ResolverFactoryService(schemaLoader, getPublicDocument, getDocumentForEdit, listDocumentsFull);
        const contextFactory = new GraphqlContextFactory(accessTokens);

        return {
          typeDefs: await schemaBuilder.buildTypeDefs(),
          resolvers: await resolverFactory.buildResolvers(),
          introspection: process.env.NODE_ENV !== "production",
          playground: process.env.NODE_ENV !== "production",
          context: ({ req }: { req: Request }) => contextFactory.createContext(req),
        };
      },
    }),
  ],
})
export class GraphqlModule {}
