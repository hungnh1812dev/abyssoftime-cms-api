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
  it("translates a single boolean eq filter into a bare leaf FilterNode", () => {
    const contentType = buildContentType();

    const result = translateListArgs(contentType, { where: { featured: { eq: true } } });

    expect(result.filterTree).toEqual({ column: "featured", operator: "$eq", value: true });
  });

  it("translates multiple operators on the same field into an implicitly-ANDed FilterNode (range query)", () => {
    const contentType = buildContentType();

    const result = translateListArgs(contentType, { where: { teamSize: { gt: 2, lte: 10 } } });

    const node = result.filterTree as { and: unknown[] };
    expect(node.and).toEqual(
      expect.arrayContaining([
        { column: "teamSize", operator: "$gt", value: 2 },
        { column: "teamSize", operator: "$lte", value: 10 },
      ]),
    );
    expect(node.and).toHaveLength(2);
  });

  it("translates multiple filtered fields into one implicitly-ANDed FilterNode per field", () => {
    const contentType = buildContentType();

    const result = translateListArgs(contentType, { where: { featured: { eq: true }, position: { contains: "Eng" } } });

    const node = result.filterTree as { and: unknown[] };
    expect(node.and).toEqual(
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

  it("translates in/notIn on a text field", () => {
    const contentType = buildContentType();

    const result = translateListArgs(contentType, { where: { position: { in: ["Eng", "Ops"] } } });

    expect(result.filterTree).toEqual({ column: "position", operator: "$in", value: ["Eng", "Ops"] });
  });

  it("translates in/notIn on a number field", () => {
    const contentType = buildContentType();

    const result = translateListArgs(contentType, { where: { teamSize: { notIn: [1, 2] } } });

    expect(result.filterTree).toEqual({ column: "teamSize", operator: "$notIn", value: [1, 2] });
  });

  it("throws BAD_USER_INPUT for in/notIn on a boolean field (not in the v1 operator set)", () => {
    const contentType = buildContentType();

    expect(() => translateListArgs(contentType, { where: { featured: { in: [true] } } })).toThrow(GraphQLError);
  });

  describe("system-field filters (SPEC.md §3.2)", () => {
    it("resolves documentId (IDFilter) to the raw document_id column, supporting eq/ne/in/notIn", () => {
      const contentType = buildContentType();

      expect(translateListArgs(contentType, { where: { documentId: { eq: "abc" } } }).filterTree).toEqual({ column: "document_id", operator: "$eq", value: "abc" });
      expect(translateListArgs(contentType, { where: { documentId: { in: ["a", "b"] } } }).filterTree).toEqual({ column: "document_id", operator: "$in", value: ["a", "b"] });
    });

    it("resolves createdAt/updatedAt/publishedAt (TimeFilter) to their raw snake_case columns, supporting eq/ne", () => {
      const contentType = buildContentType();
      const when = new Date("2024-01-01T00:00:00.000Z");

      expect(translateListArgs(contentType, { where: { createdAt: { eq: when } } }).filterTree).toEqual({ column: "created_at", operator: "$eq", value: when });
      expect(translateListArgs(contentType, { where: { updatedAt: { ne: when } } }).filterTree).toEqual({ column: "updated_at", operator: "$ne", value: when });
      expect(translateListArgs(contentType, { where: { publishedAt: { eq: when } } }).filterTree).toEqual({ column: "published_at", operator: "$eq", value: when });
    });

    it("throws BAD_USER_INPUT for in/notIn on a TimeFilter field (not in its operator set)", () => {
      const contentType = buildContentType();

      expect(() => translateListArgs(contentType, { where: { createdAt: { in: [new Date()] } } })).toThrow(GraphQLError);
    });
  });

  it("defaults start to 0, size to 10, orderBy to created_at desc when omitted (SPEC.md §3.3 rule 1)", () => {
    const contentType = buildContentType();

    const result = translateListArgs(contentType, {});

    expect(result.start).toBe(0);
    expect(result.size).toBe(10);
    expect(result.orderBy).toBe("created_at");
    expect(result.sortDir).toBe("desc");
    expect(result.filterTree).toBeUndefined();
  });

  describe("filter combinators and/or/not (SPEC.md §3.5)", () => {
    it("recurses and[] into an ANDed FilterNode array", () => {
      const contentType = buildContentType();

      const result = translateListArgs(contentType, { where: { and: [{ featured: { eq: true } }, { position: { contains: "Eng" } }] } });

      expect(result.filterTree).toEqual({
        and: [
          { column: "featured", operator: "$eq", value: true },
          { column: "position", operator: "$contains", value: "Eng" },
        ],
      });
    });

    it("recurses or[] into an ORed FilterNode array", () => {
      const contentType = buildContentType();

      const result = translateListArgs(contentType, { where: { or: [{ featured: { eq: true } }, { position: { contains: "Eng" } }] } });

      expect(result.filterTree).toEqual({
        or: [
          { column: "featured", operator: "$eq", value: true },
          { column: "position", operator: "$contains", value: "Eng" },
        ],
      });
    });

    it("recurses not into a negated single FilterNode", () => {
      const contentType = buildContentType();

      const result = translateListArgs(contentType, { where: { not: { featured: { eq: true } } } });

      expect(result.filterTree).toEqual({ not: { column: "featured", operator: "$eq", value: true } });
    });

    it("reproduces SPEC.md §3.5's example: and[ documentId in, or[ featured eq, title contains ] ]", () => {
      const contentType = buildContentType();

      const result = translateListArgs(contentType, {
        where: { and: [{ documentId: { in: ["a", "b"] } }, { or: [{ featured: { eq: true } }, { position: { contains: "launch" } }] }] },
      });

      expect(result.filterTree).toEqual({
        and: [
          { column: "document_id", operator: "$in", value: ["a", "b"] },
          {
            or: [
              { column: "featured", operator: "$eq", value: true },
              { column: "position", operator: "$contains", value: "launch" },
            ],
          },
        ],
      });
    });

    it("ANDs direct field conditions together with and/or/not present at the same level", () => {
      const contentType = buildContentType();

      const result = translateListArgs(contentType, { where: { featured: { eq: true }, or: [{ position: { contains: "Eng" } }] } });

      expect(result.filterTree).toEqual({
        and: [{ column: "featured", operator: "$eq", value: true }, { or: [{ column: "position", operator: "$contains", value: "Eng" }] }],
      });
    });

    it("propagates BAD_USER_INPUT from a leaf nested inside a combinator", () => {
      const contentType = buildContentType();

      expect(() => translateListArgs(contentType, { where: { and: [{ nope: { eq: "x" } }] } })).toThrow(GraphQLError);
    });
  });

  describe("pagination (SPEC.md §3.3)", () => {
    function expectBadUserInput(pagination: Record<string, number>, message: string): void {
      const contentType = buildContentType();
      try {
        translateListArgs(contentType, { pagination });
        fail("expected translateListArgs to throw");
      } catch (error) {
        expect(error).toBeInstanceOf(GraphQLError);
        expect((error as GraphQLError).message).toBe(message);
        expect((error as GraphQLError).extensions?.code).toBe("BAD_USER_INPUT");
      }
    }

    it("rule 1: pagination omitted -> start 0, limit 10", () => {
      const contentType = buildContentType();
      const result = translateListArgs(contentType, {});
      expect(result.start).toBe(0);
      expect(result.size).toBe(10);
    });

    it("rule 2: both offset (start/limit) and page (page/pageSize) fields set -> error", () => {
      expectBadUserInput({ start: 0, page: 1, pageSize: 10 }, "cannot mix offset (start/limit) and page (page/pageSize) modes");
      expectBadUserInput({ limit: 10, page: 1, pageSize: 10 }, "cannot mix offset (start/limit) and page (page/pageSize) modes");
    });

    it("rule 3: only one of page/pageSize set -> error", () => {
      expectBadUserInput({ page: 1 }, "page and pageSize must both be provided");
      expectBadUserInput({ pageSize: 10 }, "page and pageSize must both be provided");
    });

    it("rule 4: page < 1 -> error", () => {
      expectBadUserInput({ page: 0, pageSize: 10 }, "page must be >= 1");
    });

    it("rule 5: pageSize == 0 -> error", () => {
      expectBadUserInput({ page: 1, pageSize: 0 }, "pageSize must not be 0");
    });

    it("page mode: pageSize < 0 -> error", () => {
      expectBadUserInput({ page: 1, pageSize: -5 }, "pageSize must not be negative");
    });

    it("rule 6: valid page mode -> pageSize clamped to 100, start = (page-1)*pageSize, limit = pageSize", () => {
      const contentType = buildContentType();

      const result = translateListArgs(contentType, { pagination: { page: 3, pageSize: 20 } });
      expect(result.start).toBe(40);
      expect(result.size).toBe(20);

      const clamped = translateListArgs(contentType, { pagination: { page: 2, pageSize: 500 } });
      expect(clamped.size).toBe(100);
      expect(clamped.start).toBe(100);
    });

    it("rule 7: offset mode, start omitted -> start 0", () => {
      const contentType = buildContentType();
      const result = translateListArgs(contentType, { pagination: { limit: 5 } });
      expect(result.start).toBe(0);
    });

    it("rule 8: offset mode, start < 0 -> clamp to 0 (no error)", () => {
      const contentType = buildContentType();
      const result = translateListArgs(contentType, { pagination: { start: -5, limit: 5 } });
      expect(result.start).toBe(0);
    });

    it("rule 9: offset mode, limit omitted -> limit 10", () => {
      const contentType = buildContentType();
      const result = translateListArgs(contentType, { pagination: { start: 40 } });
      expect(result.size).toBe(10);
    });

    it("rule 10: offset mode, limit == 0 -> error", () => {
      expectBadUserInput({ limit: 0 }, "limit must not be 0");
    });

    it("rule 11: offset mode, limit == -1 -> unlimited", () => {
      const contentType = buildContentType();
      const result = translateListArgs(contentType, { pagination: { limit: -1 } });
      expect(result.size).toBe(-1);
    });

    it("rule 12: offset mode, limit > 100 -> clamp to 100 (no error)", () => {
      const contentType = buildContentType();
      const result = translateListArgs(contentType, { pagination: { limit: 500 } });
      expect(result.size).toBe(100);
    });

    it("offset mode: limit < -1 -> error", () => {
      expectBadUserInput({ limit: -2 }, "limit must not be negative (use -1 for unlimited)");
    });

    it("rule 13: offset mode, 0 < limit <= 100 -> used as-is", () => {
      const contentType = buildContentType();
      const result = translateListArgs(contentType, { pagination: { start: 40, limit: 10 } });
      expect(result.start).toBe(40);
      expect(result.size).toBe(10);
    });
  });

  it("translates a scalar-field orderBy", () => {
    const contentType = buildContentType();

    const result = translateListArgs(contentType, { orderBy: { position: "asc" } });

    expect(result.orderBy).toBe("position");
    expect(result.sortDir).toBe("asc");
  });

  it("orders by the numeric auto-increment id column", () => {
    const contentType = buildContentType();

    const result = translateListArgs(contentType, { orderBy: { id: "desc" } });

    expect(result.orderBy).toBe("id");
    expect(result.sortDir).toBe("desc");
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

  it("throws BAD_USER_INPUT for a multi-field orderBy instead of silently applying only the first field", () => {
    const contentType = buildContentType();

    try {
      translateListArgs(contentType, { orderBy: { position: "asc", teamSize: "desc" } });
      fail("expected translateListArgs to throw");
    } catch (error) {
      expect((error as GraphQLError).extensions?.code).toBe("BAD_USER_INPUT");
    }
  });
});
