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
    { name: "coverImage", type: "media" },
    { name: "skills", type: "component", component: "skill", repeatable: true, fields: [{ name: "level", type: "text" }] },
    {
      name: "experiences",
      type: "component",
      component: "experience",
      repeatable: true,
      fields: [
        { name: "company", type: "text" },
        {
          name: "roles",
          type: "component",
          component: "role",
          repeatable: true,
          fields: [
            { name: "position", type: "text" },
            { name: "techStack", type: "json" },
          ],
        },
      ],
    },
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
  it("emits a scalar-and-media object type + single query for a collection-type definition", async () => {
    const service = new SchemaBuilderService(buildSchemaLoader([cvPage]));

    const typeDefs = await service.buildTypeDefs();
    const schema = buildSchema(typeDefs);

    const cvPageType = schema.getType("CvPage") as GraphQLObjectType;
    expect(cvPageType).toBeDefined();
    const fields = cvPageType.getFields();
    expect(Object.keys(fields)).toEqual([
      "documentId",
      "id",
      "position",
      "isMain",
      "company",
      "summary",
      "coverImage",
      "skills",
      "experiences",
      "createdAt",
      "updatedAt",
      "publishedAt",
    ]);
    expect(fields.documentId.type.toString()).toBe("ID!");
    expect(fields.id.type.toString()).toBe("Int");
    expect(fields.position.type).toBe(GraphQLString);
    expect(fields.company.type).toBe(GraphQLString);
    expect(fields.summary.type).toBe(GraphQLString);
    expect(fields.isMain.type.toString()).toBe("Boolean");
    expect(fields.coverImage.type.toString()).toBe("MediaAsset");
    expect(fields.createdAt.type.toString()).toBe("DateTime!");
    expect(fields.updatedAt.type.toString()).toBe("DateTime!");
    expect(fields.publishedAt.type.toString()).toBe("DateTime");

    const queryFields = schema.getQueryType()!.getFields();
    expect(queryFields.cvPage).toBeDefined();
    expect(queryFields.cvPage.type.toString()).toBe("CvPage");
    expect(queryFields.cvPage.args.map((arg) => arg.name)).toEqual(["documentId", "status"]);
    const idArg = queryFields.cvPage.args.find((a) => a.name === "documentId")!;
    expect(idArg.type.toString()).toBe("ID!");
    const statusArg = queryFields.cvPage.args.find((a) => a.name === "status")!;
    expect(statusArg.type.toString()).toBe("String");
  });

  it("produces the analogous scalar-only type + query for en-it-vocab", async () => {
    const service = new SchemaBuilderService(buildSchemaLoader([enItVocab]));

    const schema = buildSchema(await service.buildTypeDefs());

    const type = schema.getType("EnItVocab") as GraphQLObjectType;
    expect(Object.keys(type.getFields())).toEqual(["documentId", "id", "wordGroup", "word", "synonyms", "phonetics", "createdAt", "updatedAt", "publishedAt"]);

    const queryFields = schema.getQueryType()!.getFields();
    expect(queryFields.enItVocab).toBeDefined();
    expect(queryFields.enItVocab.type.toString()).toBe("EnItVocab");
  });

  it("emits an object type + status-only single query for a single-kind definition", async () => {
    const service = new SchemaBuilderService(buildSchemaLoader([singleTypeDef]));

    const schema = buildSchema(await service.buildTypeDefs());

    const homePageType = schema.getType("HomePage") as GraphQLObjectType;
    expect(homePageType).toBeDefined();
    expect(Object.keys(homePageType.getFields())).toEqual(["documentId", "id", "title", "createdAt", "updatedAt", "publishedAt"]);

    const queryFields = schema.getQueryType()!.getFields();
    expect(queryFields.homePage).toBeDefined();
    expect(queryFields.homePage.type.toString()).toBe("HomePage");
    expect(queryFields.homePage.args.map((arg) => arg.name)).toEqual(["status"]);
    expect(queryFields.homePage.args[0].type.toString()).toBe("String");
  });

  it("does not emit Filter/OrderBy input types or a list query for a single-kind definition", async () => {
    const service = new SchemaBuilderService(buildSchemaLoader([singleTypeDef]));

    const schema = buildSchema(await service.buildTypeDefs());

    expect(schema.getType("HomePageFilter")).toBeUndefined();
    expect(schema.getType("HomePageOrderBy")).toBeUndefined();
    expect(schema.getQueryType()!.getFields().homePageList).toBeUndefined();
  });

  it("returns identical SDL across repeated calls (deterministic ordering)", async () => {
    const service = new SchemaBuilderService(buildSchemaLoader([cvPage, enItVocab]));

    const first = await service.buildTypeDefs();
    const second = await service.buildTypeDefs();

    expect(first).toBe(second);
  });

  it("emits <Type>Filter with system-field filters first, then one entry per listable scalar field, typed by field kind (text/number/boolean only)", async () => {
    const service = new SchemaBuilderService(buildSchemaLoader([cvPage]));

    const schema = buildSchema(await service.buildTypeDefs());

    const filterType = schema.getType("CvPageFilter") as GraphQLInputObjectType;
    expect(filterType).toBeDefined();
    const fields = filterType.getFields();
    // richtext ("summary") and component ("skills") fields are not listable/filterable in v1.
    expect(Object.keys(fields)).toEqual(["documentId", "createdAt", "updatedAt", "publishedAt", "position", "isMain", "company", "and", "or", "not"]);
    expect(fields.documentId.type.toString()).toBe("IDFilter");
    expect(fields.createdAt.type.toString()).toBe("TimeFilter");
    expect(fields.updatedAt.type.toString()).toBe("TimeFilter");
    expect(fields.publishedAt.type.toString()).toBe("TimeFilter");
    expect(fields.position.type.toString()).toBe("TextFilter");
    expect(fields.isMain.type.toString()).toBe("BooleanFilter");
    expect(fields.company.type.toString()).toBe("TextFilter");
  });

  it("makes <Type>Filter self-referencing via and/or/not (SPEC.md §3.5 combinators)", async () => {
    const service = new SchemaBuilderService(buildSchemaLoader([cvPage]));

    const schema = buildSchema(await service.buildTypeDefs());

    const filterType = schema.getType("CvPageFilter") as GraphQLInputObjectType;
    const fields = filterType.getFields();

    expect(fields.and.type.toString()).toBe("[CvPageFilter!]");
    expect(fields.or.type.toString()).toBe("[CvPageFilter!]");
    expect(fields.not.type.toString()).toBe("CvPageFilter");
  });

  it("emits shared TextFilter/NumberFilter/BooleanFilter/IDFilter/TimeFilter input types once, with SPEC.md's v1 operator set", async () => {
    const service = new SchemaBuilderService(buildSchemaLoader([cvPage]));

    const schema = buildSchema(await service.buildTypeDefs());

    const textFilter = schema.getType("TextFilter") as GraphQLInputObjectType;
    expect(Object.keys(textFilter.getFields())).toEqual(["eq", "ne", "contains", "in", "notIn"]);

    const numberFilter = schema.getType("NumberFilter") as GraphQLInputObjectType;
    expect(Object.keys(numberFilter.getFields())).toEqual(["eq", "ne", "gt", "gte", "lt", "lte", "in", "notIn"]);

    const booleanFilter = schema.getType("BooleanFilter") as GraphQLInputObjectType;
    expect(Object.keys(booleanFilter.getFields())).toEqual(["eq", "ne"]);

    const idFilter = schema.getType("IDFilter") as GraphQLInputObjectType;
    expect(Object.keys(idFilter.getFields())).toEqual(["eq", "ne", "in", "notIn"]);
    expect(idFilter.getFields().eq.type.toString()).toBe("ID");
    expect(idFilter.getFields().in.type.toString()).toBe("[ID!]");

    const timeFilter = schema.getType("TimeFilter") as GraphQLInputObjectType;
    expect(Object.keys(timeFilter.getFields())).toEqual(["eq", "ne"]);
    expect(timeFilter.getFields().eq.type.toString()).toBe("DateTime");
  });

  it("emits <Type>OrderBy with sortable scalar fields plus id and the three system timestamps, enum-valued", async () => {
    const service = new SchemaBuilderService(buildSchemaLoader([cvPage]));

    const schema = buildSchema(await service.buildTypeDefs());

    const orderByType = schema.getType("CvPageOrderBy") as GraphQLInputObjectType;
    expect(orderByType).toBeDefined();
    const fields = orderByType.getFields();
    expect(Object.keys(fields)).toEqual(["position", "isMain", "company", "id", "createdAt", "updatedAt", "publishedAt"]);
    expect(fields.position.type.toString()).toBe("SortDirection");
    expect(fields.id.type.toString()).toBe("SortDirection");

    const sortDirection = schema.getType("SortDirection") as GraphQLEnumType;
    expect(sortDirection.getValues().map((v) => v.name)).toEqual(["ASC", "DESC", "asc", "desc"]);
  });

  it("emits a single shared MediaAsset type, regardless of how many content types have media fields", async () => {
    const service = new SchemaBuilderService(buildSchemaLoader([cvPage, enItVocab]));

    const typeDefs = await service.buildTypeDefs();
    const schema = buildSchema(typeDefs);

    const mediaAssetType = schema.getType("MediaAsset") as GraphQLObjectType;
    expect(mediaAssetType).toBeDefined();
    const fields = mediaAssetType.getFields();
    expect(Object.keys(fields)).toEqual(["documentId", "url", "thumbnailUrl", "fileName", "width", "height"]);
    expect(fields.documentId.type.toString()).toBe("ID!");
    expect(fields.url.type.toString()).toBe("String!");
    expect(fields.thumbnailUrl.type.toString()).toBe("String!");
    expect(fields.fileName.type.toString()).toBe("String!");
    expect(fields.width.type.toString()).toBe("Int!");
    expect(fields.height.type.toString()).toBe("Int!");

    expect(typeDefs.match(/type MediaAsset /g)).toHaveLength(1);
  });

  it("recursively emits nested component types, named <ContentType><Component>, array-wrapped when repeatable", async () => {
    const service = new SchemaBuilderService(buildSchemaLoader([cvPage]));

    const schema = buildSchema(await service.buildTypeDefs());

    const cvPageType = schema.getType("CvPage") as GraphQLObjectType;
    expect(cvPageType.getFields().skills.type.toString()).toBe("[CvPageSkill!]!");
    expect(cvPageType.getFields().experiences.type.toString()).toBe("[CvPageExperience!]!");

    const skillType = schema.getType("CvPageSkill") as GraphQLObjectType;
    expect(skillType).toBeDefined();
    expect(Object.keys(skillType.getFields())).toEqual(["level"]);

    const experienceType = schema.getType("CvPageExperience") as GraphQLObjectType;
    expect(experienceType).toBeDefined();
    expect(Object.keys(experienceType.getFields())).toEqual(["company", "roles"]);
    expect(experienceType.getFields().roles.type.toString()).toBe("[CvPageRole!]!");

    const roleType = schema.getType("CvPageRole") as GraphQLObjectType;
    expect(roleType).toBeDefined();
    expect(Object.keys(roleType.getFields())).toEqual(["position", "techStack"]);
  });

  it("emits a shared JSON scalar once and maps json-typed nested fields to it", async () => {
    const service = new SchemaBuilderService(buildSchemaLoader([cvPage]));

    const typeDefs = await service.buildTypeDefs();
    const schema = buildSchema(typeDefs);

    const roleType = schema.getType("CvPageRole") as GraphQLObjectType;
    expect(roleType.getFields().techStack.type.toString()).toBe("JSON");
    expect(typeDefs.match(/scalar JSON/g)).toHaveLength(1);
  });

  it("emits a shared DateTime scalar once, regardless of how many content types are defined", async () => {
    const service = new SchemaBuilderService(buildSchemaLoader([cvPage, enItVocab]));

    const typeDefs = await service.buildTypeDefs();

    expect(typeDefs.match(/scalar DateTime/g)).toHaveLength(1);
  });

  it("emits <slug>List returning a non-null <Type>List envelope, with where/orderBy/pagination args", async () => {
    const service = new SchemaBuilderService(buildSchemaLoader([cvPage]));

    const schema = buildSchema(await service.buildTypeDefs());

    const queryFields = schema.getQueryType()!.getFields();
    const listField = queryFields.cvPages;
    expect(listField).toBeDefined();
    expect(listField.type.toString()).toBe("CvPageList!");

    expect(listField.args.map((arg) => arg.name)).toEqual(["where", "orderBy", "pagination"]);
    expect(listField.args.find((a) => a.name === "where")!.type.toString()).toBe("CvPageFilter");
    expect(listField.args.find((a) => a.name === "orderBy")!.type.toString()).toBe("CvPageOrderBy");
    expect(listField.args.find((a) => a.name === "pagination")!.type.toString()).toBe("PaginationInput");
  });

  it("emits <Type>List { items, meta } wrapping a non-null list of non-null items", async () => {
    const service = new SchemaBuilderService(buildSchemaLoader([cvPage]));

    const schema = buildSchema(await service.buildTypeDefs());

    const listType = schema.getType("CvPageList") as GraphQLObjectType;
    expect(listType).toBeDefined();
    const fields = listType.getFields();
    expect(Object.keys(fields)).toEqual(["items", "meta"]);
    expect(fields.items.type).toBeInstanceOf(GraphQLNonNull);
    const itemsOfType = (fields.items.type as GraphQLNonNull<GraphQLList<unknown>>).ofType;
    expect(itemsOfType).toBeInstanceOf(GraphQLList);
    expect((itemsOfType as GraphQLList<GraphQLNonNull<GraphQLObjectType>>).ofType.toString()).toBe("CvPage!");
    expect(fields.meta.type.toString()).toBe("ListMeta!");
  });

  it("emits shared PaginationInput/PaginationMeta/ListMeta types once", async () => {
    const service = new SchemaBuilderService(buildSchemaLoader([cvPage, enItVocab]));

    const typeDefs = await service.buildTypeDefs();
    const schema = buildSchema(typeDefs);

    const paginationInput = schema.getType("PaginationInput") as GraphQLInputObjectType;
    expect(Object.keys(paginationInput.getFields())).toEqual(["start", "limit", "page", "pageSize"]);
    expect(paginationInput.getFields().start.type.toString()).toBe("Int");
    expect(paginationInput.getFields().limit.type.toString()).toBe("Int");
    expect(paginationInput.getFields().page.type.toString()).toBe("Int");
    expect(paginationInput.getFields().pageSize.type.toString()).toBe("Int");

    const paginationMeta = schema.getType("PaginationMeta") as GraphQLObjectType;
    expect(Object.keys(paginationMeta.getFields())).toEqual(["page", "pageSize", "total"]);
    expect(paginationMeta.getFields().page.type.toString()).toBe("Int!");
    expect(paginationMeta.getFields().pageSize.type.toString()).toBe("Int!");
    expect(paginationMeta.getFields().total.type.toString()).toBe("Int!");

    const listMeta = schema.getType("ListMeta") as GraphQLObjectType;
    expect(Object.keys(listMeta.getFields())).toEqual(["pagination"]);
    expect(listMeta.getFields().pagination.type.toString()).toBe("PaginationMeta!");

    expect(typeDefs.match(/input PaginationInput /g)).toHaveLength(1);
    expect(typeDefs.match(/type PaginationMeta /g)).toHaveLength(1);
    expect(typeDefs.match(/type ListMeta /g)).toHaveLength(1);
  });

  it("emits <Type>Input mirroring the object type's shape, with media fields as ID and repeatable components as an optional list", async () => {
    const service = new SchemaBuilderService(buildSchemaLoader([cvPage]));

    const schema = buildSchema(await service.buildTypeDefs());

    const inputType = schema.getType("CvPageInput") as GraphQLInputObjectType;
    expect(inputType).toBeDefined();
    const fields = inputType.getFields();
    expect(Object.keys(fields)).toEqual(["position", "isMain", "company", "summary", "coverImage", "skills", "experiences"]);
    expect(fields.position.type).toBe(GraphQLString);
    expect(fields.coverImage.type.toString()).toBe("ID");
    // Nullable list (not [X!]!): a partial <Type>Input submitting only some fields must not be
    // forced to also submit every other repeatable component as an empty array.
    expect(fields.skills.type.toString()).toBe("[CvPageSkillInput!]");
    expect(fields.experiences.type.toString()).toBe("[CvPageExperienceInput!]");
  });

  it("recursively emits <ContentType><Component>Input for nested components", async () => {
    const service = new SchemaBuilderService(buildSchemaLoader([cvPage]));

    const schema = buildSchema(await service.buildTypeDefs());

    const skillInput = schema.getType("CvPageSkillInput") as GraphQLInputObjectType;
    expect(skillInput).toBeDefined();
    expect(Object.keys(skillInput.getFields())).toEqual(["level"]);

    const experienceInput = schema.getType("CvPageExperienceInput") as GraphQLInputObjectType;
    expect(Object.keys(experienceInput.getFields())).toEqual(["company", "roles"]);
    expect(experienceInput.getFields().roles.type.toString()).toBe("[CvPageRoleInput!]");

    const roleInput = schema.getType("CvPageRoleInput") as GraphQLInputObjectType;
    expect(Object.keys(roleInput.getFields())).toEqual(["position", "techStack"]);
    expect(roleInput.getFields().techStack.type.toString()).toBe("JSON");
  });

  it("emits the 5 collection-type mutations with SPEC.md's arg/return types", async () => {
    const service = new SchemaBuilderService(buildSchemaLoader([cvPage]));

    const schema = buildSchema(await service.buildTypeDefs());

    const mutationFields = schema.getMutationType()!.getFields();

    expect(mutationFields.createCvPage.args.map((a) => a.name)).toEqual(["data"]);
    expect(mutationFields.createCvPage.args[0].type.toString()).toBe("CvPageInput!");
    expect(mutationFields.createCvPage.type.toString()).toBe("CvPage!");

    expect(mutationFields.updateCvPage.args.map((a) => a.name)).toEqual(["documentId", "data"]);
    expect(mutationFields.updateCvPage.args[0].type.toString()).toBe("ID!");
    expect(mutationFields.updateCvPage.args[1].type.toString()).toBe("CvPageInput!");
    expect(mutationFields.updateCvPage.type.toString()).toBe("CvPage!");

    expect(mutationFields.deleteCvPage.args.map((a) => a.name)).toEqual(["documentId"]);
    expect(mutationFields.deleteCvPage.type.toString()).toBe("Boolean!");

    expect(mutationFields.publishCvPage.args.map((a) => a.name)).toEqual(["documentId"]);
    expect(mutationFields.publishCvPage.type.toString()).toBe("CvPage!");

    expect(mutationFields.unpublishCvPage.args.map((a) => a.name)).toEqual(["documentId"]);
    expect(mutationFields.unpublishCvPage.type.toString()).toBe("CvPage!");
  });

  it("emits save/publish/unpublish mutations (no create/update/delete/documentId) for a single-kind definition", async () => {
    const service = new SchemaBuilderService(buildSchemaLoader([singleTypeDef]));

    const schema = buildSchema(await service.buildTypeDefs());

    const mutationFields = schema.getMutationType()!.getFields();
    expect(mutationFields.createHomePage).toBeUndefined();
    expect(mutationFields.updateHomePage).toBeUndefined();
    expect(mutationFields.deleteHomePage).toBeUndefined();

    expect(mutationFields.saveHomePage.args.map((a) => a.name)).toEqual(["data"]);
    expect(mutationFields.saveHomePage.args[0].type.toString()).toBe("HomePageInput!");
    expect(mutationFields.saveHomePage.type.toString()).toBe("HomePage!");

    expect(mutationFields.publishHomePage.args).toEqual([]);
    expect(mutationFields.publishHomePage.type.toString()).toBe("HomePage!");

    expect(mutationFields.unpublishHomePage.args).toEqual([]);
    expect(mutationFields.unpublishHomePage.type.toString()).toBe("HomePage!");
  });

  it("emits <Type>Input for a single-kind definition too", async () => {
    const service = new SchemaBuilderService(buildSchemaLoader([singleTypeDef]));

    const schema = buildSchema(await service.buildTypeDefs());

    const inputType = schema.getType("HomePageInput") as GraphQLInputObjectType;
    expect(inputType).toBeDefined();
    expect(Object.keys(inputType.getFields())).toEqual(["title"]);
  });
});
