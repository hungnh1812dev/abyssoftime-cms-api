import { buildSchema, GraphQLEnumType, GraphQLInputObjectType, GraphQLList, GraphQLNonNull, GraphQLObjectType, GraphQLString } from "graphql";

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

  it("emits <Type>Filter with one entry per listable scalar field, typed by field kind (text/number/boolean only)", async () => {
    const service = new SchemaBuilderService(buildSchemaLoader([cvPage]));

    const schema = buildSchema(await service.buildTypeDefs());

    const filterType = schema.getType("CvPageFilter") as GraphQLInputObjectType;
    expect(filterType).toBeDefined();
    const fields = filterType.getFields();
    // richtext ("summary") and component ("skills") fields are not listable/filterable in v1.
    expect(Object.keys(fields)).toEqual(["position", "isMain", "company"]);
    expect(fields.position.type.toString()).toBe("TextFilter");
    expect(fields.isMain.type.toString()).toBe("BooleanFilter");
    expect(fields.company.type.toString()).toBe("TextFilter");
  });

  it("emits shared TextFilter/NumberFilter/BooleanFilter input types once, with SPEC.md's v1 operator set", async () => {
    const service = new SchemaBuilderService(buildSchemaLoader([cvPage]));

    const schema = buildSchema(await service.buildTypeDefs());

    const textFilter = schema.getType("TextFilter") as GraphQLInputObjectType;
    expect(Object.keys(textFilter.getFields())).toEqual(["eq", "ne", "contains"]);

    const numberFilter = schema.getType("NumberFilter") as GraphQLInputObjectType;
    expect(Object.keys(numberFilter.getFields())).toEqual(["eq", "ne", "gt", "gte", "lt", "lte"]);

    const booleanFilter = schema.getType("BooleanFilter") as GraphQLInputObjectType;
    expect(Object.keys(booleanFilter.getFields())).toEqual(["eq"]);
  });

  it("emits <Type>OrderBy with sortable scalar fields plus the three system timestamps, enum-valued", async () => {
    const service = new SchemaBuilderService(buildSchemaLoader([cvPage]));

    const schema = buildSchema(await service.buildTypeDefs());

    const orderByType = schema.getType("CvPageOrderBy") as GraphQLInputObjectType;
    expect(orderByType).toBeDefined();
    const fields = orderByType.getFields();
    expect(Object.keys(fields)).toEqual(["position", "isMain", "company", "createdAt", "updatedAt", "publishedAt"]);
    expect(fields.position.type.toString()).toBe("SortDirection");

    const sortDirection = schema.getType("SortDirection") as GraphQLEnumType;
    expect(sortDirection.getValues().map((v) => v.name)).toEqual(["ASC", "DESC"]);
  });

  it("emits <slug>List returning a non-null list of non-null items, with where/orderBy/start/size args", async () => {
    const service = new SchemaBuilderService(buildSchemaLoader([cvPage]));

    const schema = buildSchema(await service.buildTypeDefs());

    const queryFields = schema.getQueryType()!.getFields();
    const listField = queryFields.cvPageList;
    expect(listField).toBeDefined();
    expect(listField.type).toBeInstanceOf(GraphQLNonNull);
    const listOfType = (listField.type as GraphQLNonNull<GraphQLList<unknown>>).ofType;
    expect(listOfType).toBeInstanceOf(GraphQLList);
    expect((listOfType as GraphQLList<GraphQLNonNull<GraphQLObjectType>>).ofType.toString()).toBe("CvPage!");

    expect(listField.args.map((arg) => arg.name)).toEqual(["where", "orderBy", "start", "size"]);
    expect(listField.args.find((a) => a.name === "where")!.type.toString()).toBe("CvPageFilter");
    expect(listField.args.find((a) => a.name === "orderBy")!.type.toString()).toBe("CvPageOrderBy");
    expect(listField.args.find((a) => a.name === "start")!.type.toString()).toBe("Int");
    expect(listField.args.find((a) => a.name === "size")!.type.toString()).toBe("Int");
  });
});
