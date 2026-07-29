import { GraphQLError } from "graphql";

import { ContentTypeEntity } from "@/modules/content-type/domain/entities/content-type.entity";
import { FieldDefinition } from "@/modules/content-type/domain/entities/field-definition";

import { translateListArgs } from "./list-args.translator";

const FIELDS: FieldDefinition[] = [
  { name: "position", type: "text" },
  { name: "teamSize", type: "number" },
  { name: "featured", type: "boolean" },
  { name: "skills", type: "component", component: "skill", repeatable: true, fields: [{ name: "level", type: "text" }] },
];

function buildContentType(): ContentTypeEntity {
  return new ContentTypeEntity("ct-1", "cv-page", "CV Page", "collection", true, FIELDS, ["position"], new Date(), new Date());
}

describe("translateListArgs", () => {
  it("translates a single boolean eq filter into a ParsedFilter", () => {
    const contentType = buildContentType();

    const result = translateListArgs(contentType, { where: { featured: { eq: true } } });

    expect(result.filters).toEqual([{ column: "featured", operator: "$eq", value: true }]);
  });

  it("translates multiple operators on the same field into separate ParsedFilter entries (range query)", () => {
    const contentType = buildContentType();

    const result = translateListArgs(contentType, { where: { teamSize: { gt: 2, lte: 10 } } });

    expect(result.filters).toEqual(
      expect.arrayContaining([
        { column: "teamSize", operator: "$gt", value: 2 },
        { column: "teamSize", operator: "$lte", value: 10 },
      ]),
    );
    expect(result.filters).toHaveLength(2);
  });

  it("translates multiple filtered fields into one ParsedFilter per field", () => {
    const contentType = buildContentType();

    const result = translateListArgs(contentType, { where: { featured: { eq: true }, position: { contains: "Eng" } } });

    expect(result.filters).toEqual(
      expect.arrayContaining([
        { column: "featured", operator: "$eq", value: true },
        { column: "position", operator: "$contains", value: "Eng" },
      ]),
    );
  });

  it("throws BAD_USER_INPUT for an unknown filter field", () => {
    const contentType = buildContentType();

    expect(() => translateListArgs(contentType, { where: { nope: { eq: "x" } } })).toThrow(GraphQLError);
    try {
      translateListArgs(contentType, { where: { nope: { eq: "x" } } });
    } catch (error) {
      expect((error as GraphQLError).extensions?.code).toBe("BAD_USER_INPUT");
    }
  });

  it("throws BAD_USER_INPUT for a component field (not filterable in v1)", () => {
    const contentType = buildContentType();

    expect(() => translateListArgs(contentType, { where: { skills: { eq: "x" } } })).toThrow(GraphQLError);
  });

  it("throws BAD_USER_INPUT for an operator illegal for the field's type (boolean ne)", () => {
    const contentType = buildContentType();

    try {
      translateListArgs(contentType, { where: { featured: { ne: true } } });
      fail("expected translateListArgs to throw");
    } catch (error) {
      expect((error as GraphQLError).extensions?.code).toBe("BAD_USER_INPUT");
    }
  });

  it("throws BAD_USER_INPUT for an operator illegal for text (gt not allowed on text)", () => {
    const contentType = buildContentType();

    expect(() => translateListArgs(contentType, { where: { position: { gt: "z" } } })).toThrow(GraphQLError);
  });

  it("defaults start to 0, size to 20, orderBy to id desc when omitted", () => {
    const contentType = buildContentType();

    const result = translateListArgs(contentType, {});

    expect(result.start).toBe(0);
    expect(result.size).toBe(20);
    expect(result.orderBy).toBe("id");
    expect(result.sortDir).toBe("desc");
    expect(result.filters).toEqual([]);
  });

  it("caps size at 100", () => {
    const contentType = buildContentType();

    const result = translateListArgs(contentType, { size: 500 });

    expect(result.size).toBe(100);
  });

  it("passes start/size straight through when within bounds", () => {
    const contentType = buildContentType();

    const result = translateListArgs(contentType, { start: 40, size: 10 });

    expect(result.start).toBe(40);
    expect(result.size).toBe(10);
  });

  it("translates a scalar-field orderBy", () => {
    const contentType = buildContentType();

    const result = translateListArgs(contentType, { orderBy: { position: "asc" } });

    expect(result.orderBy).toBe("position");
    expect(result.sortDir).toBe("asc");
  });

  it("aliases camelCase system-timestamp orderBy fields to their raw snake_case columns", () => {
    const contentType = buildContentType();

    const result = translateListArgs(contentType, { orderBy: { createdAt: "desc" } });

    expect(result.orderBy).toBe("created_at");
    expect(result.sortDir).toBe("desc");
  });

  it("throws BAD_USER_INPUT for an unknown orderBy field", () => {
    const contentType = buildContentType();

    expect(() => translateListArgs(contentType, { orderBy: { nope: "asc" } })).toThrow(GraphQLError);
  });
});
