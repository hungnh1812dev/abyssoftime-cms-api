import { ContentTypeEntity } from "../../../content-type/domain/entities/content-type.entity";

import { BadRequestException } from "@nestjs/common";

import { FieldDefinition } from "@/modules/content-type/domain/entities/field-definition";

import { parseListQuery } from "./list-query.parser";

describe("parseListQuery", () => {
  const FIELDS: FieldDefinition[] = [
    { name: "wordGroup", type: "text" },
    { name: "teamSize", type: "number" },
    { name: "isMain", type: "boolean" },
    { name: "bio", type: "richtext" },
    { name: "avatar", type: "media" },
    { name: "techStack", type: "json" },
    { name: "roles", type: "component", component: "role", repeatable: true, fields: [] },
  ];

  function buildContentType(listFields: string[]): ContentTypeEntity {
    return new ContentTypeEntity("ct-1", "en-it-vocab", "EN-IT Vocab", "collection", true, FIELDS, listFields, new Date(), new Date());
  }

  it("applies defaults when no query params are given", () => {
    const contentType = buildContentType(["wordGroup", "bio", "teamSize"]);

    const options = parseListQuery(contentType, {});

    expect(options).toEqual({
      start: 0,
      size: 20,
      orderBy: "id",
      sortDir: "desc",
      search: undefined,
      listFields: ["wordGroup", "bio", "teamSize"],
      searchableFields: ["wordGroup", "bio"],
    });
  });

  it("parses provided start/size/orderBy/sortDir/search", () => {
    const contentType = buildContentType(["wordGroup"]);

    const options = parseListQuery(contentType, { start: "40", size: "10", orderBy: "wordGroup", sortDir: "asc", search: "hello" });

    expect(options).toMatchObject({ start: 40, size: 10, orderBy: "wordGroup", sortDir: "asc", search: "hello" });
  });

  it("accepts a system column as orderBy", () => {
    const contentType = buildContentType([]);

    expect(parseListQuery(contentType, { orderBy: "created_at" }).orderBy).toBe("created_at");
  });

  it("only includes text/richtext listFields as searchable, excluding number/boolean/json/media/component", () => {
    const contentType = buildContentType(["wordGroup", "teamSize", "isMain", "bio", "avatar", "techStack", "roles"]);

    expect(parseListQuery(contentType, {}).searchableFields).toEqual(["wordGroup", "bio"]);
  });

  it("rejects size greater than 100", () => {
    const contentType = buildContentType([]);

    expect(() => parseListQuery(contentType, { size: "101" })).toThrow(BadRequestException);
  });

  it("rejects a size of zero or negative", () => {
    const contentType = buildContentType([]);

    expect(() => parseListQuery(contentType, { size: "0" })).toThrow(BadRequestException);
    expect(() => parseListQuery(contentType, { size: "-5" })).toThrow(BadRequestException);
  });

  it("rejects a negative start", () => {
    const contentType = buildContentType([]);

    expect(() => parseListQuery(contentType, { start: "-1" })).toThrow(BadRequestException);
  });

  it("rejects a non-numeric start or size", () => {
    const contentType = buildContentType([]);

    expect(() => parseListQuery(contentType, { start: "abc" })).toThrow(BadRequestException);
    expect(() => parseListQuery(contentType, { size: "abc" })).toThrow(BadRequestException);
  });

  it("rejects an orderBy field not in the sortable allowlist", () => {
    const contentType = buildContentType([]);

    expect(() => parseListQuery(contentType, { orderBy: "bio" })).toThrow(BadRequestException);
    expect(() => parseListQuery(contentType, { orderBy: "techStack" })).toThrow(BadRequestException);
    expect(() => parseListQuery(contentType, { orderBy: "roles" })).toThrow(BadRequestException);
    expect(() => parseListQuery(contentType, { orderBy: "unknownField" })).toThrow(BadRequestException);
  });

  it("rejects an invalid sortDir", () => {
    const contentType = buildContentType([]);

    expect(() => parseListQuery(contentType, { sortDir: "up" })).toThrow(BadRequestException);
  });
});
