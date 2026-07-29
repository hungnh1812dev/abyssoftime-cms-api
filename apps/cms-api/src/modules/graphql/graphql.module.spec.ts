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
import { GetPublicSingleTypeService } from "@/modules/document/application/services/get-public-single-type.service";
import { GetSingleTypeService } from "@/modules/document/application/services/get-single-type.service";
import { ListDocumentsFullService } from "@/modules/document/application/services/list-documents-full.service";
import { PublishDocumentService } from "@/modules/document/application/services/publish-document.service";
import { PublishSingleTypeService } from "@/modules/document/application/services/publish-single-type.service";
import { SaveDocumentService } from "@/modules/document/application/services/save-document.service";
import { SaveSingleTypeService } from "@/modules/document/application/services/save-single-type.service";
import { UnpublishDocumentService } from "@/modules/document/application/services/unpublish-document.service";
import { UnpublishSingleTypeService } from "@/modules/document/application/services/unpublish-single-type.service";
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

    const homePage: ContentTypeDefinition = {
      slug: "home-page",
      name: "Home Page",
      kind: "single",
      draftToPublish: true,
      fields: [{ name: "heroTitle", type: "text" }],
    };

    async function invokeFactory() {
      const schemaLoader = { load: jest.fn().mockResolvedValue([cvPage, homePage]) } as unknown as SchemaLoaderService;
      const getPublicDocument = {} as GetPublicDocumentService;
      const getDocumentForEdit = {} as GetDocumentForEditService;
      const listDocumentsFull = {} as ListDocumentsFullService;
      const accessTokens = {} as IAccessTokenRepository;
      const mediaAssets = {} as IMediaAssetRepository;
      const saveDocument = {} as SaveDocumentService;
      const publishDocument = {} as PublishDocumentService;
      const unpublishDocument = {} as UnpublishDocumentService;
      const deleteDocument = {} as DeleteDocumentService;
      const getPublicSingleType = {} as GetPublicSingleTypeService;
      const getSingleType = {} as GetSingleTypeService;
      const saveSingleType = {} as SaveSingleTypeService;
      const publishSingleType = {} as PublishSingleTypeService;
      const unpublishSingleType = {} as UnpublishSingleTypeService;

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
        getPublicSingleType,
        getSingleType,
        saveSingleType,
        publishSingleType,
        unpublishSingleType,
      );
    }

    it("injects SchemaLoaderService, GetPublicDocumentService, GetDocumentForEditService, ListDocumentsFullService, ACCESS_TOKEN_REPOSITORY, MEDIA_ASSET_REPOSITORY, the 4 mutation-backing services, and the 5 single-type services", () => {
      expect(options.inject).toHaveLength(15);
    });

    it("builds real typeDefs via SchemaBuilderService", async () => {
      const config = await invokeFactory();

      expect(config.typeDefs).toContain("type CvPage");
      expect(config.typeDefs).toContain("cvPage(Id: ID!, status: String): CvPage");
      expect(config.typeDefs).toContain("type HomePage");
      expect(config.typeDefs).toContain("homePage(status: String): HomePage");
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
      expect(resolvers.Query.homePage).toBeInstanceOf(Function);
      expect(resolvers.Mutation.saveHomePage).toBeInstanceOf(Function);
      expect(resolvers.Mutation.publishHomePage).toBeInstanceOf(Function);
      expect(resolvers.Mutation.unpublishHomePage).toBeInstanceOf(Function);
      expect(resolvers.SortDirection).toEqual({ ASC: "asc", DESC: "desc" });
    });

    it("gates introspection/playground to non-production", async () => {
      const config = await invokeFactory();

      expect(config.introspection).toBe(process.env.NODE_ENV !== "production");
      expect(config.playground).toBe(process.env.NODE_ENV !== "production");
    });

    it("actually flips introspection/playground off when NODE_ENV is production, not just passthrough of whatever env happens to be set", async () => {
      const originalNodeEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = "production";
      try {
        const config = await invokeFactory();

        expect(config.introspection).toBe(false);
        expect(config.playground).toBe(false);
      } finally {
        process.env.NODE_ENV = originalNodeEnv;
      }
    });

    it("builds a context function that resolves { req } to a GraphqlContext", async () => {
      const config = await invokeFactory();
      const context = config.context as (arg: { req: unknown }) => Promise<{ apiToken: unknown }>;

      await expect(context({ req: { headers: {} } })).resolves.toEqual({ apiToken: null });
    });

    it("wires formatGraphqlError as formatError, so unmapped errors never leak internal details to a client", async () => {
      const config = await invokeFactory();
      const formatError = config.formatError as (formattedError: { message: string; extensions?: { code?: string } }) => { message: string; extensions?: { code?: string } };

      expect(formatError({ message: 'relation "documents" does not exist' })).toEqual({
        message: "Internal server error",
        locations: undefined,
        path: undefined,
        extensions: { code: "INTERNAL_SERVER_ERROR" },
      });
      expect(formatError({ message: "safe", extensions: { code: "NOT_FOUND" } })).toEqual({ message: "safe", extensions: { code: "NOT_FOUND" } });
    });
  });
});
