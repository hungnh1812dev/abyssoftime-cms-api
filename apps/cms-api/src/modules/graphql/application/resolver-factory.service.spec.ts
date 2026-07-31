import { DateTimeScalar } from "../domain/date-time-scalar";
import { JSONScalar } from "../domain/json-scalar";

import { BadRequestException, NotFoundException } from "@nestjs/common";

import { SchemaLoaderService } from "@/modules/content-type/application/schema/schema-loader.service";
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
import { DocumentEntity } from "@/modules/document/domain/entities/document.entity";
import { MediaAssetEntity } from "@/modules/media/domain/entities/media-asset.entity";
import { type IMediaAssetRepository } from "@/modules/media/domain/repositories/media-asset.repository";

import { type GraphqlContext } from "./graphql-context.factory";
import { ResolverFactoryService } from "./resolver-factory.service";

const cvPage: ContentTypeDefinition = {
  slug: "cv-page",
  name: "CV Page",
  kind: "collection",
  draftToPublish: true,
  fields: [
    { name: "position", type: "text" },
    { name: "isMain", type: "boolean" },
    { name: "coverImage", type: "media" },
    {
      name: "gallery",
      type: "component",
      component: "galleryItem",
      repeatable: true,
      fields: [
        { name: "caption", type: "text" },
        { name: "photo", type: "media" },
      ],
    },
  ],
};

const homePage: ContentTypeDefinition = {
  slug: "home-page",
  name: "Home Page",
  kind: "single",
  draftToPublish: true,
  fields: [{ name: "heroTitle", type: "text" }],
};

const validId = "5f8b1a3e-4d2c-4a1b-9e3f-2c1d4a5b6c7d";
const anotherValidId = "6a9c2b4f-5e3d-4b2c-8f4a-3d2e5b6c7d8e";

function buildDocument(fields: Record<string, unknown>): DocumentEntity {
  return new DocumentEntity(validId, "published", fields, new Date(), new Date(), new Date(), null, null, null);
}

describe("ResolverFactoryService", () => {
  let schemaLoader: jest.Mocked<SchemaLoaderService>;
  let getPublicDocument: jest.Mocked<GetPublicDocumentService>;
  let getDocumentForEdit: jest.Mocked<GetDocumentForEditService>;
  let listDocumentsFull: jest.Mocked<ListDocumentsFullService>;
  let mediaAssets: jest.Mocked<IMediaAssetRepository>;
  let saveDocument: jest.Mocked<SaveDocumentService>;
  let publishDocument: jest.Mocked<PublishDocumentService>;
  let unpublishDocument: jest.Mocked<UnpublishDocumentService>;
  let deleteDocument: jest.Mocked<DeleteDocumentService>;
  let getPublicSingleType: jest.Mocked<GetPublicSingleTypeService>;
  let getSingleType: jest.Mocked<GetSingleTypeService>;
  let saveSingleType: jest.Mocked<SaveSingleTypeService>;
  let publishSingleType: jest.Mocked<PublishSingleTypeService>;
  let unpublishSingleType: jest.Mocked<UnpublishSingleTypeService>;
  let service: ResolverFactoryService;

  const noToken: GraphqlContext = { apiToken: null };
  const readScopedToken: GraphqlContext = { apiToken: { documentId: "token-1", name: "CI", permissions: ["document:read"] } };
  const createScopedToken: GraphqlContext = { apiToken: { documentId: "token-1", name: "CI", permissions: ["document:create"] } };
  const updateScopedToken: GraphqlContext = { apiToken: { documentId: "token-1", name: "CI", permissions: ["document:update"] } };
  const deleteScopedToken: GraphqlContext = { apiToken: { documentId: "token-1", name: "CI", permissions: ["document:delete"] } };
  const publishScopedToken: GraphqlContext = { apiToken: { documentId: "token-1", name: "CI", permissions: ["document:publish"] } };
  const unpublishScopedToken: GraphqlContext = { apiToken: { documentId: "token-1", name: "CI", permissions: ["document:unpublish"] } };

  beforeEach(() => {
    schemaLoader = { load: jest.fn().mockResolvedValue([cvPage]), loadFromDir: jest.fn() } as unknown as jest.Mocked<SchemaLoaderService>;
    getPublicDocument = { execute: jest.fn() } as unknown as jest.Mocked<GetPublicDocumentService>;
    getDocumentForEdit = { execute: jest.fn() } as unknown as jest.Mocked<GetDocumentForEditService>;
    listDocumentsFull = { execute: jest.fn().mockResolvedValue({ items: [], total: 0, start: 0, size: 10 }) } as unknown as jest.Mocked<ListDocumentsFullService>;
    mediaAssets = { findByDocumentId: jest.fn() } as unknown as jest.Mocked<IMediaAssetRepository>;
    saveDocument = { execute: jest.fn() } as unknown as jest.Mocked<SaveDocumentService>;
    publishDocument = { execute: jest.fn() } as unknown as jest.Mocked<PublishDocumentService>;
    unpublishDocument = { execute: jest.fn() } as unknown as jest.Mocked<UnpublishDocumentService>;
    deleteDocument = { execute: jest.fn() } as unknown as jest.Mocked<DeleteDocumentService>;
    getPublicSingleType = { execute: jest.fn() } as unknown as jest.Mocked<GetPublicSingleTypeService>;
    getSingleType = { execute: jest.fn() } as unknown as jest.Mocked<GetSingleTypeService>;
    saveSingleType = { execute: jest.fn() } as unknown as jest.Mocked<SaveSingleTypeService>;
    publishSingleType = { execute: jest.fn() } as unknown as jest.Mocked<PublishSingleTypeService>;
    unpublishSingleType = { execute: jest.fn() } as unknown as jest.Mocked<UnpublishSingleTypeService>;
    service = new ResolverFactoryService(
      schemaLoader,
      getPublicDocument,
      getDocumentForEdit,
      listDocumentsFull,
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
  });

  it("builds single-item and list Query resolvers named after each collection-type's camelCase slug", async () => {
    const resolvers = await service.buildResolvers();

    expect(Object.keys(resolvers.Query)).toEqual(["cvPage", "cvPages"]);
  });

  it("requires document:read for a published-data query and rejects when the context has no token", async () => {
    const resolvers = await service.buildResolvers();

    await expect(resolvers.Query.cvPage(undefined, { documentId: validId }, noToken, undefined)).rejects.toMatchObject({
      extensions: { code: "UNAUTHENTICATED" },
    });
    expect(getPublicDocument.execute).not.toHaveBeenCalled();
  });

  it("rejects a published-data query with a wrongly-scoped token, FORBIDDEN", async () => {
    const resolvers = await service.buildResolvers();

    await expect(resolvers.Query.cvPage(undefined, { documentId: validId }, createScopedToken, undefined)).rejects.toMatchObject({
      extensions: { code: "FORBIDDEN" },
    });
    expect(getPublicDocument.execute).not.toHaveBeenCalled();
  });

  it("delegates a non-draft query to GetPublicDocumentService with (slug, documentId) when the token is document:read-scoped", async () => {
    getPublicDocument.execute.mockResolvedValue(buildDocument({ position: "Engineer" }));
    const resolvers = await service.buildResolvers();

    const result = await resolvers.Query.cvPage(undefined, { documentId: validId }, readScopedToken, undefined);

    expect(getPublicDocument.execute).toHaveBeenCalledWith("cv-page", validId);
    expect(getDocumentForEdit.execute).not.toHaveBeenCalled();
    expect(result).toEqual(expect.objectContaining({ position: "Engineer" }));
  });

  it("returns null (not an error) when the published document doesn't exist", async () => {
    getPublicDocument.execute.mockRejectedValue(new NotFoundException("not found"));
    const resolvers = await service.buildResolvers();

    const result = await resolvers.Query.cvPage(undefined, { documentId: anotherValidId }, readScopedToken, undefined);

    expect(result).toBeNull();
  });

  it("rejects a malformed (non-UUID) documentId with a BAD_USER_INPUT GraphQL error, never a raw 500", async () => {
    const resolvers = await service.buildResolvers();

    await expect(resolvers.Query.cvPage(undefined, { documentId: "not-a-uuid" }, noToken, undefined)).rejects.toMatchObject({
      extensions: { code: "BAD_USER_INPUT" },
    });
    expect(getPublicDocument.execute).not.toHaveBeenCalled();
  });

  it("requires document:read for status: draft and rejects when the context has no token", async () => {
    const resolvers = await service.buildResolvers();

    await expect(resolvers.Query.cvPage(undefined, { documentId: validId, status: "draft" }, noToken, undefined)).rejects.toMatchObject({
      extensions: { code: "UNAUTHENTICATED" },
    });
    expect(getDocumentForEdit.execute).not.toHaveBeenCalled();
  });

  it("delegates a draft query to GetDocumentForEditService when the token is document:read-scoped", async () => {
    getDocumentForEdit.execute.mockResolvedValue({ document: buildDocument({ position: "Draft Engineer" }), status: "draft" });
    const resolvers = await service.buildResolvers();

    const result = await resolvers.Query.cvPage(undefined, { documentId: validId, status: "draft" }, readScopedToken, undefined);

    expect(getDocumentForEdit.execute).toHaveBeenCalledWith("cv-page", validId);
    expect(result).toEqual(expect.objectContaining({ position: "Draft Engineer" }));
  });

  it("returns null (not an error) when the draft document doesn't exist", async () => {
    getDocumentForEdit.execute.mockRejectedValue(new NotFoundException("not found"));
    const resolvers = await service.buildResolvers();

    const result = await resolvers.Query.cvPage(undefined, { documentId: anotherValidId, status: "draft" }, readScopedToken, undefined);

    expect(result).toBeNull();
  });

  it("requires document:read for cvPages and rejects when the context has no token", async () => {
    const resolvers = await service.buildResolvers();

    await expect(resolvers.Query.cvPages(undefined, {}, noToken, undefined)).rejects.toMatchObject({
      extensions: { code: "UNAUTHENTICATED" },
    });
    expect(listDocumentsFull.execute).not.toHaveBeenCalled();
  });

  it("rejects cvPages with a wrongly-scoped token, FORBIDDEN", async () => {
    const resolvers = await service.buildResolvers();

    await expect(resolvers.Query.cvPages(undefined, {}, createScopedToken, undefined)).rejects.toMatchObject({
      extensions: { code: "FORBIDDEN" },
    });
    expect(listDocumentsFull.execute).not.toHaveBeenCalled();
  });

  it("delegates cvPages to translateListArgs + ListDocumentsFullService.execute when the token is document:read-scoped", async () => {
    const items = [{ documentId: validId, position: "Engineer", isMain: true }];
    listDocumentsFull.execute.mockResolvedValue({ items, total: 1, start: 0, size: 10 });
    const resolvers = await service.buildResolvers();

    const result = await resolvers.Query.cvPages(undefined, { where: { isMain: { eq: true } }, pagination: { start: 0, limit: 10 } }, readScopedToken, undefined);

    expect(listDocumentsFull.execute).toHaveBeenCalledWith(
      "cv-page",
      expect.objectContaining({ start: 0, size: 10, filterTree: { column: "isMain", operator: "$eq", value: true } }),
    );
    expect(result).toEqual({ items, meta: { pagination: { page: 1, pageSize: 10, total: 1 } } });
  });

  it("computes page/pageSize post-resolution from start/size, including the limit: -1 unlimited case", async () => {
    listDocumentsFull.execute.mockResolvedValue({ items: [], total: 37, start: 20, size: 10 });
    const resolvers = await service.buildResolvers();

    const paged = await resolvers.Query.cvPages(undefined, { pagination: { start: 20, limit: 10 } }, readScopedToken, undefined);
    expect(paged).toMatchObject({ meta: { pagination: { page: 3, pageSize: 10, total: 37 } } });

    listDocumentsFull.execute.mockResolvedValue({ items: [], total: 37, start: 0, size: -1 });
    const unlimited = await resolvers.Query.cvPages(undefined, { pagination: { limit: -1 } }, readScopedToken, undefined);
    expect(unlimited).toMatchObject({ meta: { pagination: { page: 1, pageSize: 37, total: 37 } } });
  });

  it("propagates a BAD_USER_INPUT GraphQL error for an invalid where field, never swallowed or ignored", async () => {
    const resolvers = await service.buildResolvers();

    await expect(resolvers.Query.cvPages(undefined, { where: { nope: { eq: 1 } } }, readScopedToken, undefined)).rejects.toMatchObject({
      extensions: { code: "BAD_USER_INPUT" },
    });
    expect(listDocumentsFull.execute).not.toHaveBeenCalled();
  });

  it("maps a NotFoundException from ListDocumentsFullService to a NOT_FOUND GraphQL error, never a bare Nest exception", async () => {
    listDocumentsFull.execute.mockRejectedValue(new NotFoundException("not found"));
    const resolvers = await service.buildResolvers();

    await expect(resolvers.Query.cvPages(undefined, {}, readScopedToken, undefined)).rejects.toMatchObject({
      extensions: { code: "NOT_FOUND" },
    });
  });

  it("returns a SortDirection enum value map (ASC/DESC -> asc/desc) alongside Query", async () => {
    const resolvers = await service.buildResolvers();

    expect(resolvers.SortDirection).toEqual({ ASC: "asc", DESC: "desc" });
  });

  describe("media field resolution", () => {
    const mediaAsset = new MediaAssetEntity(
      "media-1",
      "photo.png",
      "image/png",
      1024,
      100,
      100,
      "https://cdn.example.com/photo.png",
      "https://cdn.example.com/photo-thumb.png",
      "public-id",
      "hash",
      null,
      new Date(),
      new Date(),
    );

    it("resolves a media-typed field's raw FK to the full MediaAsset via MEDIA_ASSET_REPOSITORY.findByDocumentId", async () => {
      mediaAssets.findByDocumentId.mockResolvedValue(mediaAsset);
      const resolvers = await service.buildResolvers();

      const result = await (resolvers.CvPage as Record<string, (parent: unknown) => Promise<unknown>>).coverImage({ coverImage: "media-1" });

      expect(mediaAssets.findByDocumentId).toHaveBeenCalledWith("media-1");
      expect(result).toBe(mediaAsset);
    });

    it("resolves a null FK to null without calling the repository", async () => {
      const resolvers = await service.buildResolvers();

      const result = await (resolvers.CvPage as Record<string, (parent: unknown) => Promise<unknown>>).coverImage({ coverImage: null });

      expect(mediaAssets.findByDocumentId).not.toHaveBeenCalled();
      expect(result).toBeNull();
    });

    it("resolves a dangling (deleted) FK to null, never throws", async () => {
      mediaAssets.findByDocumentId.mockResolvedValue(null);
      const resolvers = await service.buildResolvers();

      const result = await (resolvers.CvPage as Record<string, (parent: unknown) => Promise<unknown>>).coverImage({ coverImage: "gone" });

      expect(result).toBeNull();
    });

    it("resolves a media-typed field nested inside a component type the same way, at any nesting depth", async () => {
      mediaAssets.findByDocumentId.mockResolvedValue(mediaAsset);
      const resolvers = await service.buildResolvers();

      const result = await (resolvers.CvPageGalleryItem as Record<string, (parent: unknown) => Promise<unknown>>).photo({ photo: "media-1" });

      expect(mediaAssets.findByDocumentId).toHaveBeenCalledWith("media-1");
      expect(result).toBe(mediaAsset);
    });
  });

  it("registers the JSON scalar resolver", async () => {
    const resolvers = await service.buildResolvers();

    expect(resolvers.JSON).toBe(JSONScalar);
  });

  it("registers the DateTime scalar resolver", async () => {
    const resolvers = await service.buildResolvers();

    expect(resolvers.DateTime).toBe(DateTimeScalar);
  });

  it("includes createdAt/updatedAt/publishedAt from the document entity in the resolved value", async () => {
    const createdAt = new Date("2026-01-01T00:00:00.000Z");
    const updatedAt = new Date("2026-01-02T00:00:00.000Z");
    const publishedAt = new Date("2026-01-03T00:00:00.000Z");
    getPublicDocument.execute.mockResolvedValue(new DocumentEntity(validId, "published", { position: "Engineer" }, createdAt, updatedAt, publishedAt, null, null, null));
    const resolvers = await service.buildResolvers();

    const result = await resolvers.Query.cvPage(undefined, { documentId: validId }, readScopedToken, undefined);

    expect(result).toEqual(expect.objectContaining({ createdAt, updatedAt, publishedAt }));
  });

  describe("mutations", () => {
    it("builds all 5 Mutation resolvers named after each collection-type's PascalCase slug", async () => {
      const resolvers = await service.buildResolvers();

      expect(Object.keys(resolvers.Mutation)).toEqual(["createCvPage", "updateCvPage", "deleteCvPage", "publishCvPage", "unpublishCvPage"]);
    });

    describe("createCvPage", () => {
      it("requires document:create and delegates to SaveDocumentService.execute(slug, data, undefined, apiToken.documentId), no re-read", async () => {
        saveDocument.execute.mockResolvedValue(buildDocument({ position: "Engineer" }));
        const resolvers = await service.buildResolvers();

        const result = await resolvers.Mutation.createCvPage(undefined, { data: { position: "Engineer" } }, createScopedToken);

        expect(saveDocument.execute).toHaveBeenCalledWith("cv-page", { position: "Engineer" }, undefined, "token-1");
        expect(getDocumentForEdit.execute).not.toHaveBeenCalled();
        expect(result).toEqual(expect.objectContaining({ position: "Engineer" }));
      });

      it("rejects a missing token with UNAUTHENTICATED, never calling the service", async () => {
        const resolvers = await service.buildResolvers();

        await expect(resolvers.Mutation.createCvPage(undefined, { data: {} }, noToken)).rejects.toMatchObject({ extensions: { code: "UNAUTHENTICATED" } });
        expect(saveDocument.execute).not.toHaveBeenCalled();
      });

      it("rejects a wrongly-scoped token with FORBIDDEN, never calling the service", async () => {
        const resolvers = await service.buildResolvers();

        await expect(resolvers.Mutation.createCvPage(undefined, { data: {} }, readScopedToken)).rejects.toMatchObject({ extensions: { code: "FORBIDDEN" } });
        expect(saveDocument.execute).not.toHaveBeenCalled();
      });
    });

    describe("updateCvPage", () => {
      it("requires document:update, saves then re-reads via GetDocumentForEditService", async () => {
        saveDocument.execute.mockResolvedValue(buildDocument({ position: "Old" }));
        getDocumentForEdit.execute.mockResolvedValue({ document: buildDocument({ position: "New" }), status: "modified" });
        const resolvers = await service.buildResolvers();

        const result = await resolvers.Mutation.updateCvPage(undefined, { documentId: validId, data: { position: "New" } }, updateScopedToken);

        expect(saveDocument.execute).toHaveBeenCalledWith("cv-page", { position: "New" }, validId, "token-1");
        expect(getDocumentForEdit.execute).toHaveBeenCalledWith("cv-page", validId);
        expect(result).toEqual(expect.objectContaining({ position: "New" }));
      });

      it("rejects a missing/wrong-scoped token, never calling the service", async () => {
        const resolvers = await service.buildResolvers();

        await expect(resolvers.Mutation.updateCvPage(undefined, { documentId: validId, data: {} }, noToken)).rejects.toMatchObject({ extensions: { code: "UNAUTHENTICATED" } });
        expect(saveDocument.execute).not.toHaveBeenCalled();
      });
    });

    describe("deleteCvPage", () => {
      it("requires document:delete, delegates to DeleteDocumentService.execute, and returns true", async () => {
        deleteDocument.execute.mockResolvedValue(undefined);
        const resolvers = await service.buildResolvers();

        const result = await resolvers.Mutation.deleteCvPage(undefined, { documentId: validId }, deleteScopedToken);

        expect(deleteDocument.execute).toHaveBeenCalledWith("cv-page", validId);
        expect(result).toBe(true);
      });

      it("maps a NotFoundException to a NOT_FOUND GraphQL error, not a silent false", async () => {
        deleteDocument.execute.mockRejectedValue(new NotFoundException("not found"));
        const resolvers = await service.buildResolvers();

        await expect(resolvers.Mutation.deleteCvPage(undefined, { documentId: validId }, deleteScopedToken)).rejects.toMatchObject({ extensions: { code: "NOT_FOUND" } });
      });

      it("rejects a missing token, never calling the service", async () => {
        const resolvers = await service.buildResolvers();

        await expect(resolvers.Mutation.deleteCvPage(undefined, { documentId: validId }, noToken)).rejects.toMatchObject({ extensions: { code: "UNAUTHENTICATED" } });
        expect(deleteDocument.execute).not.toHaveBeenCalled();
      });
    });

    describe("publishCvPage", () => {
      it("requires document:publish and delegates directly to PublishDocumentService.execute", async () => {
        publishDocument.execute.mockResolvedValue(buildDocument({ position: "Published" }));
        const resolvers = await service.buildResolvers();

        const result = await resolvers.Mutation.publishCvPage(undefined, { documentId: validId }, publishScopedToken);

        expect(publishDocument.execute).toHaveBeenCalledWith("cv-page", validId, "token-1");
        expect(result).toEqual(expect.objectContaining({ position: "Published" }));
      });

      it("maps a BadRequestException (Mode B) to a BAD_USER_INPUT GraphQL error, not a 500", async () => {
        publishDocument.execute.mockRejectedValue(new BadRequestException("draft/publish disabled"));
        const resolvers = await service.buildResolvers();

        await expect(resolvers.Mutation.publishCvPage(undefined, { documentId: validId }, publishScopedToken)).rejects.toMatchObject({ extensions: { code: "BAD_USER_INPUT" } });
      });

      it("rejects a wrongly-scoped token, never calling the service", async () => {
        const resolvers = await service.buildResolvers();

        await expect(resolvers.Mutation.publishCvPage(undefined, { documentId: validId }, readScopedToken)).rejects.toMatchObject({ extensions: { code: "FORBIDDEN" } });
        expect(publishDocument.execute).not.toHaveBeenCalled();
      });
    });

    describe("unpublishCvPage", () => {
      it("requires document:unpublish, unpublishes then re-reads via GetDocumentForEditService", async () => {
        unpublishDocument.execute.mockResolvedValue(undefined);
        getDocumentForEdit.execute.mockResolvedValue({ document: buildDocument({ position: "Draft again" }), status: "draft" });
        const resolvers = await service.buildResolvers();

        const result = await resolvers.Mutation.unpublishCvPage(undefined, { documentId: validId }, unpublishScopedToken);

        expect(unpublishDocument.execute).toHaveBeenCalledWith("cv-page", validId);
        expect(getDocumentForEdit.execute).toHaveBeenCalledWith("cv-page", validId);
        expect(result).toEqual(expect.objectContaining({ position: "Draft again" }));
      });

      it("maps a BadRequestException (Mode B) to a BAD_USER_INPUT GraphQL error", async () => {
        unpublishDocument.execute.mockRejectedValue(new BadRequestException("draft/publish disabled"));
        const resolvers = await service.buildResolvers();

        await expect(resolvers.Mutation.unpublishCvPage(undefined, { documentId: validId }, unpublishScopedToken)).rejects.toMatchObject({
          extensions: { code: "BAD_USER_INPUT" },
        });
      });

      it("rejects a missing token, never calling the service", async () => {
        const resolvers = await service.buildResolvers();

        await expect(resolvers.Mutation.unpublishCvPage(undefined, { documentId: validId }, noToken)).rejects.toMatchObject({ extensions: { code: "UNAUTHENTICATED" } });
        expect(unpublishDocument.execute).not.toHaveBeenCalled();
      });
    });

    describe("single-type (home-page)", () => {
      beforeEach(() => {
        schemaLoader.load.mockResolvedValue([homePage]);
      });

      it("builds a status-only Query resolver and save/publish/unpublish Mutation resolvers, no list/create/update/delete", async () => {
        const resolvers = await service.buildResolvers();

        expect(Object.keys(resolvers.Query)).toEqual(["homePage"]);
        expect(Object.keys(resolvers.Mutation)).toEqual(["saveHomePage", "publishHomePage", "unpublishHomePage"]);
      });

      it("requires document:read for a published-data query and rejects when the context has no token", async () => {
        const resolvers = await service.buildResolvers();

        await expect(resolvers.Query.homePage(undefined, {}, noToken, undefined)).rejects.toMatchObject({
          extensions: { code: "UNAUTHENTICATED" },
        });
        expect(getPublicSingleType.execute).not.toHaveBeenCalled();
      });

      it("rejects a published-data query with a wrongly-scoped token, FORBIDDEN", async () => {
        const resolvers = await service.buildResolvers();

        await expect(resolvers.Query.homePage(undefined, {}, createScopedToken, undefined)).rejects.toMatchObject({
          extensions: { code: "FORBIDDEN" },
        });
        expect(getPublicSingleType.execute).not.toHaveBeenCalled();
      });

      it("delegates a non-draft query to GetPublicSingleTypeService with (slug) when the token is document:read-scoped", async () => {
        getPublicSingleType.execute.mockResolvedValue(buildDocument({ heroTitle: "Welcome" }));
        const resolvers = await service.buildResolvers();

        const result = await resolvers.Query.homePage(undefined, {}, readScopedToken, undefined);

        expect(getPublicSingleType.execute).toHaveBeenCalledWith("home-page");
        expect(getSingleType.execute).not.toHaveBeenCalled();
        expect(result).toEqual(expect.objectContaining({ heroTitle: "Welcome" }));
      });

      it("returns null (not an error) when the published document doesn't exist", async () => {
        getPublicSingleType.execute.mockRejectedValue(new NotFoundException("not found"));
        const resolvers = await service.buildResolvers();

        const result = await resolvers.Query.homePage(undefined, {}, readScopedToken, undefined);

        expect(result).toBeNull();
      });

      it("requires document:read for status: draft and rejects when the context has no token", async () => {
        const resolvers = await service.buildResolvers();

        await expect(resolvers.Query.homePage(undefined, { status: "draft" }, noToken, undefined)).rejects.toMatchObject({
          extensions: { code: "UNAUTHENTICATED" },
        });
        expect(getSingleType.execute).not.toHaveBeenCalled();
      });

      it("delegates a draft query to GetSingleTypeService when the token is document:read-scoped", async () => {
        getSingleType.execute.mockResolvedValue({ document: buildDocument({ heroTitle: "Draft Welcome" }), status: "draft" });
        const resolvers = await service.buildResolvers();

        const result = await resolvers.Query.homePage(undefined, { status: "draft" }, readScopedToken, undefined);

        expect(getSingleType.execute).toHaveBeenCalledWith("home-page");
        expect(result).toEqual(expect.objectContaining({ heroTitle: "Draft Welcome" }));
      });

      describe("saveHomePage", () => {
        it("requires document:update, saves then re-reads via GetSingleTypeService", async () => {
          saveSingleType.execute.mockResolvedValue(buildDocument({ heroTitle: "Old" }));
          getSingleType.execute.mockResolvedValue({ document: buildDocument({ heroTitle: "New" }), status: "modified" });
          const resolvers = await service.buildResolvers();

          const result = await resolvers.Mutation.saveHomePage(undefined, { data: { heroTitle: "New" } }, updateScopedToken);

          expect(saveSingleType.execute).toHaveBeenCalledWith("home-page", { heroTitle: "New" }, "token-1");
          expect(getSingleType.execute).toHaveBeenCalledWith("home-page");
          expect(result).toEqual(expect.objectContaining({ heroTitle: "New" }));
        });

        it("rejects a missing token, never calling the service", async () => {
          const resolvers = await service.buildResolvers();

          await expect(resolvers.Mutation.saveHomePage(undefined, { data: {} }, noToken)).rejects.toMatchObject({ extensions: { code: "UNAUTHENTICATED" } });
          expect(saveSingleType.execute).not.toHaveBeenCalled();
        });

        it("rejects a wrongly-scoped token with FORBIDDEN, never calling the service", async () => {
          const resolvers = await service.buildResolvers();

          await expect(resolvers.Mutation.saveHomePage(undefined, { data: {} }, readScopedToken)).rejects.toMatchObject({ extensions: { code: "FORBIDDEN" } });
          expect(saveSingleType.execute).not.toHaveBeenCalled();
        });
      });

      describe("publishHomePage", () => {
        it("requires document:publish and delegates directly to PublishSingleTypeService.execute", async () => {
          publishSingleType.execute.mockResolvedValue(buildDocument({ heroTitle: "Published" }));
          const resolvers = await service.buildResolvers();

          const result = await resolvers.Mutation.publishHomePage(undefined, {}, publishScopedToken);

          expect(publishSingleType.execute).toHaveBeenCalledWith("home-page", "token-1");
          expect(result).toEqual(expect.objectContaining({ heroTitle: "Published" }));
        });

        it("maps a BadRequestException (Mode B) to a BAD_USER_INPUT GraphQL error, not a 500", async () => {
          publishSingleType.execute.mockRejectedValue(new BadRequestException("draft/publish disabled"));
          const resolvers = await service.buildResolvers();

          await expect(resolvers.Mutation.publishHomePage(undefined, {}, publishScopedToken)).rejects.toMatchObject({ extensions: { code: "BAD_USER_INPUT" } });
        });

        it("rejects a wrongly-scoped token, never calling the service", async () => {
          const resolvers = await service.buildResolvers();

          await expect(resolvers.Mutation.publishHomePage(undefined, {}, readScopedToken)).rejects.toMatchObject({ extensions: { code: "FORBIDDEN" } });
          expect(publishSingleType.execute).not.toHaveBeenCalled();
        });
      });

      describe("unpublishHomePage", () => {
        it("requires document:unpublish, unpublishes then re-reads via GetSingleTypeService", async () => {
          unpublishSingleType.execute.mockResolvedValue(undefined);
          getSingleType.execute.mockResolvedValue({ document: buildDocument({ heroTitle: "Draft again" }), status: "draft" });
          const resolvers = await service.buildResolvers();

          const result = await resolvers.Mutation.unpublishHomePage(undefined, {}, unpublishScopedToken);

          expect(unpublishSingleType.execute).toHaveBeenCalledWith("home-page");
          expect(getSingleType.execute).toHaveBeenCalledWith("home-page");
          expect(result).toEqual(expect.objectContaining({ heroTitle: "Draft again" }));
        });

        it("maps a BadRequestException (Mode B) to a BAD_USER_INPUT GraphQL error", async () => {
          unpublishSingleType.execute.mockRejectedValue(new BadRequestException("draft/publish disabled"));
          const resolvers = await service.buildResolvers();

          await expect(resolvers.Mutation.unpublishHomePage(undefined, {}, unpublishScopedToken)).rejects.toMatchObject({ extensions: { code: "BAD_USER_INPUT" } });
        });

        it("rejects a missing token, never calling the service", async () => {
          const resolvers = await service.buildResolvers();

          await expect(resolvers.Mutation.unpublishHomePage(undefined, {}, noToken)).rejects.toMatchObject({ extensions: { code: "UNAUTHENTICATED" } });
          expect(unpublishSingleType.execute).not.toHaveBeenCalled();
        });

        it("rejects a wrongly-scoped token with FORBIDDEN, never calling the service", async () => {
          const resolvers = await service.buildResolvers();

          await expect(resolvers.Mutation.unpublishHomePage(undefined, {}, readScopedToken)).rejects.toMatchObject({ extensions: { code: "FORBIDDEN" } });
          expect(unpublishSingleType.execute).not.toHaveBeenCalled();
        });
      });
    });

    it("rejects a malformed (non-UUID) documentId for update/delete/publish/unpublish with BAD_USER_INPUT", async () => {
      const resolvers = await service.buildResolvers();

      await expect(resolvers.Mutation.updateCvPage(undefined, { documentId: "not-a-uuid", data: {} }, updateScopedToken)).rejects.toMatchObject({
        extensions: { code: "BAD_USER_INPUT" },
      });
      await expect(resolvers.Mutation.deleteCvPage(undefined, { documentId: "not-a-uuid" }, deleteScopedToken)).rejects.toMatchObject({
        extensions: { code: "BAD_USER_INPUT" },
      });
      await expect(resolvers.Mutation.publishCvPage(undefined, { documentId: "not-a-uuid" }, publishScopedToken)).rejects.toMatchObject({
        extensions: { code: "BAD_USER_INPUT" },
      });
      await expect(resolvers.Mutation.unpublishCvPage(undefined, { documentId: "not-a-uuid" }, unpublishScopedToken)).rejects.toMatchObject({
        extensions: { code: "BAD_USER_INPUT" },
      });
    });
  });
});
