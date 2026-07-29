import { ApolloDriver, type ApolloDriverConfig } from "@nestjs/apollo";
import { MODULE_METADATA } from "@nestjs/common/constants";
import { GraphQLModule as NestGraphQLModule } from "@nestjs/graphql";

import { AccessTokenModule } from "@/modules/access-tokens/access-token.module";
import { type IAccessTokenRepository } from "@/modules/access-tokens/domain/repositories/access-token.repository";
import { SchemaLoaderService } from "@/modules/content-type/application/schema/schema-loader.service";
import { ContentTypeModule } from "@/modules/content-type/content-type.module";
import { ContentTypeDefinition } from "@/modules/content-type/domain/entities/content-type.entity";
import { DeleteDocumentService } from "@/modules/document/application/services/delete-document.service";
import { GetDocumentForEditService } from "@/modules/document/application/services/get-document-for-edit.service";
import { GetPublicDocumentService } from "@/modules/document/application/services/get-public-document.service";
import { ListDocumentsFullService } from "@/modules/document/application/services/list-documents-full.service";
import { PublishDocumentService } from "@/modules/document/application/services/publish-document.service";
import { SaveDocumentService } from "@/modules/document/application/services/save-document.service";
import { UnpublishDocumentService } from "@/modules/document/application/services/unpublish-document.service";
import { DocumentModule } from "@/modules/document/document.module";
import { type IMediaAssetRepository } from "@/modules/media/domain/repositories/media-asset.repository";
import { MediaModule } from "@/modules/media/media.module";

// Import after the mock is registered — evaluating GraphqlModule's @Module decorator is what
// triggers the (now mocked) forRootAsync call, letting us capture its options synchronously.
import { GraphqlModule } from "./graphql.module";

jest.mock("@nestjs/graphql", () => {
  const actual = jest.requireActual<typeof import("@nestjs/graphql")>("@nestjs/graphql");
  return { ...actual, GraphQLModule: { forRootAsync: jest.fn().mockReturnValue({ module: "MockedNestGraphQLModule" }) } };
});

describe("GraphqlModule", () => {
  const options = jest.mocked(NestGraphQLModule.forRootAsync).mock.calls[0][0] as ApolloDriverConfig & {
    imports: unknown[];
    inject: unknown[];
    useFactory: (...args: unknown[]) => Promise<ApolloDriverConfig>;
  };

  it("uses ApolloDriver", () => {
    expect(options.driver).toBe(ApolloDriver);
  });

  it("imports ContentTypeModule, DocumentModule, AccessTokenModule, and MediaModule for the async factory's DI scope", () => {
    expect(options.imports).toEqual([ContentTypeModule, DocumentModule, AccessTokenModule, MediaModule]);
  });

  it("declares NestGraphQLModule.forRootAsync's dynamic module as GraphqlModule's only import", () => {
    expect(Reflect.getMetadata(MODULE_METADATA.IMPORTS, GraphqlModule)).toEqual([{ module: "MockedNestGraphQLModule" }]);
  });

  describe("useFactory", () => {
    const cvPage: ContentTypeDefinition = {
      slug: "cv-page",
      name: "CV Page",
      kind: "collection",
      draftToPublish: true,
      fields: [{ name: "position", type: "text" }],
    };

    async function invokeFactory() {
      const schemaLoader = { load: jest.fn().mockResolvedValue([cvPage]) } as unknown as SchemaLoaderService;
      const getPublicDocument = {} as GetPublicDocumentService;
      const getDocumentForEdit = {} as GetDocumentForEditService;
      const listDocumentsFull = {} as ListDocumentsFullService;
      const accessTokens = {} as IAccessTokenRepository;
      const mediaAssets = {} as IMediaAssetRepository;
      const saveDocument = {} as SaveDocumentService;
      const publishDocument = {} as PublishDocumentService;
      const unpublishDocument = {} as UnpublishDocumentService;
      const deleteDocument = {} as DeleteDocumentService;

      return options.useFactory(
        schemaLoader,
        getPublicDocument,
        getDocumentForEdit,
        listDocumentsFull,
        accessTokens,
        mediaAssets,
        saveDocument,
        publishDocument,
        unpublishDocument,
        deleteDocument,
      );
    }

    it("injects SchemaLoaderService, GetPublicDocumentService, GetDocumentForEditService, ListDocumentsFullService, ACCESS_TOKEN_REPOSITORY, MEDIA_ASSET_REPOSITORY, and the 4 mutation-backing services", () => {
      expect(options.inject).toHaveLength(10);
    });

    it("builds real typeDefs via SchemaBuilderService", async () => {
      const config = await invokeFactory();

      expect(config.typeDefs).toContain("type CvPage");
      expect(config.typeDefs).toContain("cvPage(Id: ID!, status: String): CvPage");
    });

    it("builds real resolvers via ResolverFactoryService", async () => {
      const config = await invokeFactory();

      const resolvers = config.resolvers as { Query: Record<string, unknown>; Mutation: Record<string, unknown>; SortDirection: Record<string, string> };
      expect(resolvers.Query.cvPage).toBeInstanceOf(Function);
      expect(resolvers.Query.cvPageList).toBeInstanceOf(Function);
      expect(resolvers.Mutation.createCvPage).toBeInstanceOf(Function);
      expect(resolvers.Mutation.updateCvPage).toBeInstanceOf(Function);
      expect(resolvers.Mutation.deleteCvPage).toBeInstanceOf(Function);
      expect(resolvers.Mutation.publishCvPage).toBeInstanceOf(Function);
      expect(resolvers.Mutation.unpublishCvPage).toBeInstanceOf(Function);
      expect(resolvers.SortDirection).toEqual({ ASC: "asc", DESC: "desc" });
    });

    it("gates introspection/playground to non-production", async () => {
      const config = await invokeFactory();

      expect(config.introspection).toBe(process.env.NODE_ENV !== "production");
      expect(config.playground).toBe(process.env.NODE_ENV !== "production");
    });

    it("builds a context function that resolves { req } to a GraphqlContext", async () => {
      const config = await invokeFactory();
      const context = config.context as (arg: { req: unknown }) => Promise<{ apiToken: unknown }>;

      await expect(context({ req: { headers: {} } })).resolves.toEqual({ apiToken: null });
    });
  });
});
