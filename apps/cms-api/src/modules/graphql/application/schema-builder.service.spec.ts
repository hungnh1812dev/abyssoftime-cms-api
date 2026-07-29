import { buildSchema, GraphQLObjectType, GraphQLString } from "graphql";

import { SchemaLoaderService } from "@/modules/content-type/application/schema/schema-loader.service";
import { ContentTypeDefinition } from "@/modules/content-type/domain/entities/content-type.entity";

import { SchemaBuilderService } from "./schema-builder.service";

function buildSchemaLoader(definitions: ContentTypeDefinition[]): jest.Mocked<SchemaLoaderService> {
  return { load: jest.fn().mockResolvedValue(definitions) } as unknown as jest.Mocked<SchemaLoaderService>;
}

const cvPage: ContentTypeDefinition = {
  slug: "cv-page",
  name: "CV Page",
  kind: "collection",
  draftToPublish: true,
  fields: [
    { name: "position", type: "text" },
    { name: "isMain", type: "boolean" },
    { name: "company", type: "text" },
    { name: "summary", type: "richtext" },
    { name: "skills", type: "component", component: "skill", repeatable: true, fields: [{ name: "level", type: "text" }] },
  ],
};

const enItVocab: ContentTypeDefinition = {
  slug: "en-it-vocab",
  name: "English IT Vocabulary",
  kind: "collection",
  draftToPublish: true,
  fields: [
    { name: "wordGroup", type: "text" },
    { name: "word", type: "text" },
    { name: "synonyms", type: "text" },
    { name: "phonetics", type: "component", component: "phonetic", repeatable: true, fields: [{ name: "ipa", type: "text" }] },
  ],
};

const singleTypeDef: ContentTypeDefinition = {
  slug: "home-page",
  name: "Home Page",
  kind: "single",
  draftToPublish: true,
  fields: [{ name: "title", type: "text" }],
};

describe("SchemaBuilderService", () => {
  it("emits a scalar-only object type + single query for a collection-type definition", async () => {
    const service = new SchemaBuilderService(buildSchemaLoader([cvPage]));

    const typeDefs = await service.buildTypeDefs();
    const schema = buildSchema(typeDefs);

    const cvPageType = schema.getType("CvPage") as GraphQLObjectType;
    expect(cvPageType).toBeDefined();
    const fields = cvPageType.getFields();
    expect(Object.keys(fields)).toEqual(["position", "isMain", "company", "summary"]);
    expect(fields.position.type).toBe(GraphQLString);
    expect(fields.company.type).toBe(GraphQLString);
    expect(fields.summary.type).toBe(GraphQLString);
    expect(fields.isMain.type.toString()).toBe("Boolean");

    const queryFields = schema.getQueryType()!.getFields();
    expect(queryFields.cvPage).toBeDefined();
    expect(queryFields.cvPage.type.toString()).toBe("CvPage");
    expect(queryFields.cvPage.args.map((arg) => arg.name)).toEqual(["Id", "status"]);
    const idArg = queryFields.cvPage.args.find((a) => a.name === "Id")!;
    expect(idArg.type.toString()).toBe("ID!");
    const statusArg = queryFields.cvPage.args.find((a) => a.name === "status")!;
    expect(statusArg.type.toString()).toBe("String");
  });

  it("produces the analogous scalar-only type + query for en-it-vocab", async () => {
    const service = new SchemaBuilderService(buildSchemaLoader([enItVocab]));

    const schema = buildSchema(await service.buildTypeDefs());

    const type = schema.getType("EnItVocab") as GraphQLObjectType;
    expect(Object.keys(type.getFields())).toEqual(["wordGroup", "word", "synonyms"]);

    const queryFields = schema.getQueryType()!.getFields();
    expect(queryFields.enItVocab).toBeDefined();
    expect(queryFields.enItVocab.type.toString()).toBe("EnItVocab");
  });

  it("skips single-kind definitions entirely", async () => {
    const service = new SchemaBuilderService(buildSchemaLoader([singleTypeDef]));

    const schema = buildSchema(await service.buildTypeDefs());

    expect(schema.getType("HomePage")).toBeUndefined();
    expect(schema.getQueryType()!.getFields().homePage).toBeUndefined();
  });

  it("returns identical SDL across repeated calls (deterministic ordering)", async () => {
    const service = new SchemaBuilderService(buildSchemaLoader([cvPage, enItVocab]));

    const first = await service.buildTypeDefs();
    const second = await service.buildTypeDefs();

    expect(first).toBe(second);
  });
});
