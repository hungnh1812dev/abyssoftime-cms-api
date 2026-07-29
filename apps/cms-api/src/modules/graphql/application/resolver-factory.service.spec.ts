import { JSONScalar } from "../domain/json-scalar";

import { NotFoundException } from "@nestjs/common";

import { SchemaLoaderService } from "@/modules/content-type/application/schema/schema-loader.service";
import { ContentTypeDefinition } from "@/modules/content-type/domain/entities/content-type.entity";
import { GetDocumentForEditService } from "@/modules/document/application/services/get-document-for-edit.service";
import { GetPublicDocumentService } from "@/modules/document/application/services/get-public-document.service";
import { ListDocumentsFullService } from "@/modules/document/application/services/list-documents-full.service";
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
  let service: ResolverFactoryService;

  const noToken: GraphqlContext = { apiToken: null };
  const readScopedToken: GraphqlContext = { apiToken: { documentId: "token-1", name: "CI", permissions: ["document:read"] } };

  beforeEach(() => {
    schemaLoader = { load: jest.fn().mockResolvedValue([cvPage]), loadFromDir: jest.fn() } as unknown as jest.Mocked<SchemaLoaderService>;
    getPublicDocument = { execute: jest.fn() } as unknown as jest.Mocked<GetPublicDocumentService>;
    getDocumentForEdit = { execute: jest.fn() } as unknown as jest.Mocked<GetDocumentForEditService>;
    listDocumentsFull = { execute: jest.fn().mockResolvedValue({ items: [], total: 0, start: 0, size: 20 }) } as unknown as jest.Mocked<ListDocumentsFullService>;
    mediaAssets = { findByDocumentId: jest.fn() } as unknown as jest.Mocked<IMediaAssetRepository>;
    service = new ResolverFactoryService(schemaLoader, getPublicDocument, getDocumentForEdit, listDocumentsFull, mediaAssets);
  });

  it("builds single-item and list Query resolvers named after each collection-type's camelCase slug", async () => {
    const resolvers = await service.buildResolvers();

    expect(Object.keys(resolvers.Query)).toEqual(["cvPage", "cvPageList"]);
  });

  it("delegates a non-draft query to GetPublicDocumentService with (slug, Id), no token required", async () => {
    getPublicDocument.execute.mockResolvedValue(buildDocument({ position: "Engineer" }));
    const resolvers = await service.buildResolvers();

    const result = await resolvers.Query.cvPage(undefined, { Id: validId }, noToken, undefined);

    expect(getPublicDocument.execute).toHaveBeenCalledWith("cv-page", validId);
    expect(getDocumentForEdit.execute).not.toHaveBeenCalled();
    expect(result).toEqual(expect.objectContaining({ position: "Engineer" }));
  });

  it("returns null (not an error) when the published document doesn't exist", async () => {
    getPublicDocument.execute.mockRejectedValue(new NotFoundException("not found"));
    const resolvers = await service.buildResolvers();

    const result = await resolvers.Query.cvPage(undefined, { Id: anotherValidId }, noToken, undefined);

    expect(result).toBeNull();
  });

  it("rejects a malformed (non-UUID) Id with a BAD_USER_INPUT GraphQL error, never a raw 500", async () => {
    const resolvers = await service.buildResolvers();

    await expect(resolvers.Query.cvPage(undefined, { Id: "not-a-uuid" }, noToken, undefined)).rejects.toMatchObject({
      extensions: { code: "BAD_USER_INPUT" },
    });
    expect(getPublicDocument.execute).not.toHaveBeenCalled();
  });

  it("requires document:read for status: draft and rejects when the context has no token", async () => {
    const resolvers = await service.buildResolvers();

    await expect(resolvers.Query.cvPage(undefined, { Id: validId, status: "draft" }, noToken, undefined)).rejects.toMatchObject({
      extensions: { code: "UNAUTHENTICATED" },
    });
    expect(getDocumentForEdit.execute).not.toHaveBeenCalled();
  });

  it("delegates a draft query to GetDocumentForEditService when the token is document:read-scoped", async () => {
    getDocumentForEdit.execute.mockResolvedValue({ document: buildDocument({ position: "Draft Engineer" }), status: "draft" });
    const resolvers = await service.buildResolvers();

    const result = await resolvers.Query.cvPage(undefined, { Id: validId, status: "draft" }, readScopedToken, undefined);

    expect(getDocumentForEdit.execute).toHaveBeenCalledWith("cv-page", validId);
    expect(result).toEqual(expect.objectContaining({ position: "Draft Engineer" }));
  });

  it("returns null (not an error) when the draft document doesn't exist", async () => {
    getDocumentForEdit.execute.mockRejectedValue(new NotFoundException("not found"));
    const resolvers = await service.buildResolvers();

    const result = await resolvers.Query.cvPage(undefined, { Id: anotherValidId, status: "draft" }, readScopedToken, undefined);

    expect(result).toBeNull();
  });

  it("delegates cvPageList to translateListArgs + ListDocumentsFullService.execute, no token required", async () => {
    const items = [{ documentId: validId, position: "Engineer", isMain: true }];
    listDocumentsFull.execute.mockResolvedValue({ items, total: 1, start: 0, size: 20 });
    const resolvers = await service.buildResolvers();

    const result = await resolvers.Query.cvPageList(undefined, { where: { isMain: { eq: true } }, start: 0, size: 10 }, noToken, undefined);

    expect(listDocumentsFull.execute).toHaveBeenCalledWith(
      "cv-page",
      expect.objectContaining({ start: 0, size: 10, filters: [{ column: "isMain", operator: "$eq", value: true }] }),
    );
    expect(result).toBe(items);
  });

  it("propagates a BAD_USER_INPUT GraphQL error for an invalid where field, never swallowed or ignored", async () => {
    const resolvers = await service.buildResolvers();

    await expect(resolvers.Query.cvPageList(undefined, { where: { nope: { eq: 1 } } }, noToken, undefined)).rejects.toMatchObject({
      extensions: { code: "BAD_USER_INPUT" },
    });
    expect(listDocumentsFull.execute).not.toHaveBeenCalled();
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
});
