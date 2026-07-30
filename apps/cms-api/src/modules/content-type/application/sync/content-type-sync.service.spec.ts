import { ContentTypeDefinition, ContentTypeEntity } from "../../domain/entities/content-type.entity";
import { IContentTypeRepository } from "../../domain/repositories/content-type.repository";
import { ISchemaTableRepository } from "../../domain/repositories/schema-table.repository";
import { SchemaLoaderService } from "../schema/schema-loader.service";

import { ContentTypeSyncService } from "./content-type-sync.service";

function buildContentTypeRepository(): jest.Mocked<IContentTypeRepository> {
  return {
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    findBySlug: jest.fn(),
    findAll: jest.fn().mockResolvedValue([]),
    findAllSummaries: jest.fn(),
    updateListFields: jest.fn(),
  };
}

function buildSchemaTableRepository(): jest.Mocked<ISchemaTableRepository> {
  return {
    ensureDocumentTable: jest.fn(),
    alterDocumentTable: jest.fn(),
    dropDocumentTable: jest.fn(),
    listDocumentColumns: jest.fn().mockResolvedValue([]),
    ensureComponentTable: jest.fn(),
    alterComponentTable: jest.fn(),
    dropComponentTable: jest.fn(),
    listComponentColumns: jest.fn().mockResolvedValue([]),
  };
}

function buildSchemaLoader(): jest.Mocked<SchemaLoaderService> {
  return { load: jest.fn(), loadFromDir: jest.fn() } as unknown as jest.Mocked<SchemaLoaderService>;
}

function entity(fields: ContentTypeEntity["fields"] = [{ name: "position", type: "text" }]): ContentTypeEntity {
  return new ContentTypeEntity("ct-1", "cv-page", "CV Page", "collection", true, fields, ["position"], new Date(), new Date());
}

describe("ContentTypeSyncService", () => {
  it("new file: creates the document table, every component table, and inserts the ContentType row", async () => {
    const contentTypes = buildContentTypeRepository();
    const schemaTables = buildSchemaTableRepository();
    const service = new ContentTypeSyncService(buildSchemaLoader(), contentTypes, schemaTables);

    const definition: ContentTypeDefinition = {
      slug: "cv-page",
      name: "CV Page",
      kind: "collection",
      draftToPublish: true,
      fields: [
        { name: "position", type: "text" },
        {
          name: "experiences",
          type: "component",
          component: "experience",
          repeatable: true,
          fields: [{ name: "company", type: "text" }],
        },
      ],
      listFields: ["position"],
    };

    await service.sync([definition]);

    expect(schemaTables.ensureDocumentTable).toHaveBeenCalledWith("cv-page", definition.fields, "collection");
    expect(schemaTables.ensureComponentTable).toHaveBeenCalledWith("cv-page", ["experience"], [{ name: "company", type: "text" }]);
    expect(schemaTables.alterDocumentTable).not.toHaveBeenCalled();
    expect(contentTypes.create).toHaveBeenCalledWith({
      slug: "cv-page",
      name: "CV Page",
      kind: "collection",
      draftToPublish: true,
      fields: definition.fields,
      listFields: ["position"],
    });
    expect(contentTypes.update).not.toHaveBeenCalled();
  });

  it("new file: passes the definition's kind through to ensureDocumentTable (single vs. collection)", async () => {
    const contentTypes = buildContentTypeRepository();
    const schemaTables = buildSchemaTableRepository();
    const service = new ContentTypeSyncService(buildSchemaLoader(), contentTypes, schemaTables);

    const definition: ContentTypeDefinition = {
      slug: "site-settings",
      name: "Site Settings",
      kind: "single",
      draftToPublish: true,
      fields: [{ name: "title", type: "text" }],
      listFields: ["title"],
    };

    await service.sync([definition]);

    expect(schemaTables.ensureDocumentTable).toHaveBeenCalledWith("site-settings", definition.fields, "single");
  });

  it("changed file: alters the document table against live columns and updates the ContentType row", async () => {
    const contentTypes = buildContentTypeRepository();
    const previous = entity();
    contentTypes.findAll.mockResolvedValue([previous]);

    const schemaTables = buildSchemaTableRepository();
    schemaTables.listDocumentColumns.mockResolvedValue([{ name: "position", dataType: "text", isNullable: true }]);

    const service = new ContentTypeSyncService(buildSchemaLoader(), contentTypes, schemaTables);

    const definition: ContentTypeDefinition = {
      slug: "cv-page",
      name: "CV Page",
      kind: "collection",
      draftToPublish: true,
      fields: [
        { name: "position", type: "text" },
        { name: "isMain", type: "boolean" },
      ],
      listFields: ["position"],
    };

    await service.sync([definition]);

    expect(schemaTables.ensureDocumentTable).not.toHaveBeenCalled();
    expect(schemaTables.alterDocumentTable).toHaveBeenCalledWith("cv-page", {
      addColumns: [{ name: "isMain", columnType: "BOOLEAN" }],
      dropColumns: [],
      retypeColumns: [],
    });
    expect(contentTypes.update).toHaveBeenCalledWith("cv-page", {
      slug: "cv-page",
      name: "CV Page",
      kind: "collection",
      draftToPublish: true,
      fields: definition.fields,
      listFields: ["position"],
    });
    expect(contentTypes.create).not.toHaveBeenCalled();
  });

  it("deleted file: deletes the ContentType row and drops the document table and every component table", async () => {
    const contentTypes = buildContentTypeRepository();
    const previous = entity([
      { name: "position", type: "text" },
      { name: "experiences", type: "component", component: "experience", repeatable: true, fields: [] },
    ]);
    contentTypes.findAll.mockResolvedValue([previous]);

    const schemaTables = buildSchemaTableRepository();
    const service = new ContentTypeSyncService(buildSchemaLoader(), contentTypes, schemaTables);

    await service.sync([]);

    expect(schemaTables.dropComponentTable).toHaveBeenCalledWith("cv-page", ["experience"]);
    expect(schemaTables.dropDocumentTable).toHaveBeenCalledWith("cv-page");
    expect(contentTypes.delete).toHaveBeenCalledWith("cv-page");
  });

  it("throws loudly for a malformed definition instead of silently syncing", async () => {
    const contentTypes = buildContentTypeRepository();
    const schemaTables = buildSchemaTableRepository();
    const service = new ContentTypeSyncService(buildSchemaLoader(), contentTypes, schemaTables);

    const malformed: ContentTypeDefinition = {
      slug: "Bad Slug!",
      name: "Bad",
      kind: "collection",
      draftToPublish: true,
      fields: [],
      listFields: [],
    };

    await expect(service.sync([malformed])).rejects.toThrow();
    expect(schemaTables.ensureDocumentTable).not.toHaveBeenCalled();
    expect(contentTypes.create).not.toHaveBeenCalled();
  });

  it("onApplicationBootstrap() loads definitions via SchemaLoaderService and syncs them", async () => {
    const contentTypes = buildContentTypeRepository();
    const schemaTables = buildSchemaTableRepository();
    const schemaLoader = buildSchemaLoader();
    const definition: ContentTypeDefinition = {
      slug: "cv-page",
      name: "CV Page",
      kind: "collection",
      draftToPublish: true,
      fields: [{ name: "position", type: "text" }],
      listFields: ["position"],
    };
    schemaLoader.load.mockResolvedValue([definition]);

    const service = new ContentTypeSyncService(schemaLoader, contentTypes, schemaTables);
    await service.onApplicationBootstrap();

    expect(schemaLoader.load).toHaveBeenCalled();
    expect(schemaTables.ensureDocumentTable).toHaveBeenCalledWith("cv-page", definition.fields, "collection");
  });
});
