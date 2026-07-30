import { ContentTypeEntity } from "../../../content-type/domain/entities/content-type.entity";

import { BadRequestException } from "@nestjs/common";

import { FieldDefinition } from "@/modules/content-type/domain/entities/field-definition";

import { FilterQueryParams, parseFilters } from "./filter-query.parser";

describe("parseFilters", () => {
  const FIELDS: FieldDefinition[] = [
    { name: "wordGroup", type: "text" },
    { name: "teamSize", type: "number" },
    { name: "isMain", type: "boolean" },
    { name: "bio", type: "richtext" },
    { name: "avatar", type: "media" },
    { name: "techStack", type: "json" },
    { name: "roles", type: "component", component: "role", repeatable: true, fields: [] },
  ];

  function buildContentType(): ContentTypeEntity {
    return new ContentTypeEntity("ct-1", "en-it-vocab", "EN-IT Vocab", "collection", true, FIELDS, [], new Date(), new Date());
  }

  it("returns an empty array when no filters are given", () => {
    expect(parseFilters(buildContentType(), undefined)).toEqual([]);
  });

  it("parses a $eq filter on a text field", () => {
    expect(parseFilters(buildContentType(), { wordGroup: { $eq: "hello" } })).toEqual([{ column: "wordGroup", operator: "$eq", value: "hello" }]);
  });

  it("parses a $contains filter on a text field", () => {
    expect(parseFilters(buildContentType(), { wordGroup: { $contains: "hel" } })).toEqual([{ column: "wordGroup", operator: "$contains", value: "hel" }]);
  });

  it("coerces a number field's value and accepts every comparison operator", () => {
    expect(parseFilters(buildContentType(), { teamSize: { $gte: "18" } })).toEqual([{ column: "teamSize", operator: "$gte", value: 18 }]);
    expect(parseFilters(buildContentType(), { teamSize: { $lt: "5" } })).toEqual([{ column: "teamSize", operator: "$lt", value: 5 }]);
  });

  it("coerces a boolean field's literal true/false value", () => {
    expect(parseFilters(buildContentType(), { isMain: { $eq: "true" } })).toEqual([{ column: "isMain", operator: "$eq", value: true }]);
    expect(parseFilters(buildContentType(), { isMain: { $ne: "false" } })).toEqual([{ column: "isMain", operator: "$ne", value: false }]);
  });

  it("parses $eq/$ne on the id and document_id system columns", () => {
    expect(parseFilters(buildContentType(), { id: { $eq: "42" } })).toEqual([{ column: "id", operator: "$eq", value: 42 }]);
    expect(parseFilters(buildContentType(), { document_id: { $ne: "abc-123" } })).toEqual([{ column: "document_id", operator: "$ne", value: "abc-123" }]);
  });

  it("parses range operators on the timestamp system columns", () => {
    expect(parseFilters(buildContentType(), { created_at: { $gte: "2024-01-01T00:00:00.000Z" } })).toEqual([
      { column: "created_at", operator: "$gte", value: "2024-01-01T00:00:00.000Z" },
    ]);
  });

  it("parses multiple fields into multiple filters", () => {
    expect(parseFilters(buildContentType(), { wordGroup: { $eq: "hello" }, teamSize: { $gt: "1" } })).toEqual([
      { column: "wordGroup", operator: "$eq", value: "hello" },
      { column: "teamSize", operator: "$gt", value: 1 },
    ]);
  });

  it("rejects a field not in the filterable allowlist", () => {
    expect(() => parseFilters(buildContentType(), { unknownField: { $eq: "x" } })).toThrow(BadRequestException);
  });

  it("rejects richtext/media/json/component fields, matching the sortable allowlist", () => {
    expect(() => parseFilters(buildContentType(), { bio: { $eq: "x" } })).toThrow(BadRequestException);
    expect(() => parseFilters(buildContentType(), { avatar: { $eq: "x" } })).toThrow(BadRequestException);
    expect(() => parseFilters(buildContentType(), { techStack: { $eq: "x" } })).toThrow(BadRequestException);
    expect(() => parseFilters(buildContentType(), { roles: { $eq: "x" } })).toThrow(BadRequestException);
  });

  it("rejects an unrecognized operator", () => {
    expect(() => parseFilters(buildContentType(), { wordGroup: { $unknown: "x" } })).toThrow(BadRequestException);
  });

  it("rejects an operator illegal for the field's value class", () => {
    expect(() => parseFilters(buildContentType(), { teamSize: { $contains: "1" } })).toThrow(BadRequestException);
    expect(() => parseFilters(buildContentType(), { isMain: { $gt: "true" } })).toThrow(BadRequestException);
    expect(() => parseFilters(buildContentType(), { wordGroup: { $gt: "a" } })).toThrow(BadRequestException);
    expect(() => parseFilters(buildContentType(), { id: { $gt: "1" } })).toThrow(BadRequestException);
  });

  it("rejects more than one operator on the same field", () => {
    expect(() => parseFilters(buildContentType(), { teamSize: { $gte: "1", $lte: "2" } })).toThrow(BadRequestException);
  });

  it("rejects a field with no operators", () => {
    expect(() => parseFilters(buildContentType(), { teamSize: {} })).toThrow(BadRequestException);
  });

  it("rejects a non-numeric value for a number field", () => {
    expect(() => parseFilters(buildContentType(), { teamSize: { $eq: "abc" } })).toThrow(BadRequestException);
  });

  it("rejects a non true/false value for a boolean field", () => {
    expect(() => parseFilters(buildContentType(), { isMain: { $eq: "yes" } })).toThrow(BadRequestException);
  });

  it("rejects an unparseable date for a timestamp system column", () => {
    expect(() => parseFilters(buildContentType(), { updated_at: { $gt: "not-a-date" } })).toThrow(BadRequestException);
  });

  it("rejects a non-string (array) value even when it would otherwise coerce, e.g. via a repeated query param", () => {
    const rawFilters = { created_at: { $gte: ["2024-01-01T00:00:00.000Z"] } } as unknown as FilterQueryParams;
    expect(() => parseFilters(buildContentType(), rawFilters)).toThrow(BadRequestException);
  });

  it("rejects a non-string (object) value for a text field", () => {
    const rawFilters = { wordGroup: { $eq: { nested: "x" } } } as unknown as FilterQueryParams;
    expect(() => parseFilters(buildContentType(), rawFilters)).toThrow(BadRequestException);
  });
});
