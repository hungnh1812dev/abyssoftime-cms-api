import { NotFoundException } from "@nestjs/common";

import { SchemaLoaderService } from "@/modules/content-type/application/schema/schema-loader.service";
import { ContentTypeDefinition } from "@/modules/content-type/domain/entities/content-type.entity";
import { GetDocumentForEditService } from "@/modules/document/application/services/get-document-for-edit.service";
import { GetPublicDocumentService } from "@/modules/document/application/services/get-public-document.service";
import { DocumentEntity } from "@/modules/document/domain/entities/document.entity";

import { type GraphqlContext } from "./graphql-context.factory";
import { ResolverFactoryService } from "./resolver-factory.service";

const cvPage: ContentTypeDefinition = {
  slug: "cv-page",
  name: "CV Page",
  kind: "collection",
  draftToPublish: true,
  fields: [{ name: "position", type: "text" }],
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
  let service: ResolverFactoryService;

  const noToken: GraphqlContext = { apiToken: null };
  const readScopedToken: GraphqlContext = { apiToken: { documentId: "token-1", name: "CI", permissions: ["document:read"] } };

  beforeEach(() => {
    schemaLoader = { load: jest.fn().mockResolvedValue([cvPage]), loadFromDir: jest.fn() } as unknown as jest.Mocked<SchemaLoaderService>;
    getPublicDocument = { execute: jest.fn() } as unknown as jest.Mocked<GetPublicDocumentService>;
    getDocumentForEdit = { execute: jest.fn() } as unknown as jest.Mocked<GetDocumentForEditService>;
    service = new ResolverFactoryService(schemaLoader, getPublicDocument, getDocumentForEdit);
  });

  it("builds a Query resolver named after each collection-type's camelCase slug", async () => {
    const resolvers = await service.buildResolvers();

    expect(Object.keys(resolvers.Query)).toEqual(["cvPage"]);
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
});
