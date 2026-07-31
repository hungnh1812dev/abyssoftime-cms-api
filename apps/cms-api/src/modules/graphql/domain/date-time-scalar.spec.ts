import { GraphQLError, Kind } from "graphql";

import { DateTimeScalar } from "./date-time-scalar";

describe("DateTimeScalar", () => {
  it("is named DateTime", () => {
    expect(DateTimeScalar.name).toBe("DateTime");
  });

  describe("serialize", () => {
    it("converts a Date to an ISO-8601 string", () => {
      const date = new Date("2026-01-15T10:30:00.000Z");

      expect(DateTimeScalar.serialize(date)).toBe("2026-01-15T10:30:00.000Z");
    });

    it("throws BAD_USER_INPUT for a non-Date value", () => {
      expect(() => DateTimeScalar.serialize("not-a-date")).toThrow(GraphQLError);
      try {
        DateTimeScalar.serialize("not-a-date");
      } catch (error) {
        expect((error as GraphQLError).extensions?.code).toBe("BAD_USER_INPUT");
      }
    });

    it("throws BAD_USER_INPUT for an invalid Date", () => {
      expect(() => DateTimeScalar.serialize(new Date("nope"))).toThrow(GraphQLError);
    });
  });

  describe("parseValue", () => {
    it("parses a valid ISO-8601 string into a real Date", () => {
      const result = DateTimeScalar.parseValue("2026-01-15T10:30:00.000Z");

      expect(result).toBeInstanceOf(Date);
      expect(result.toISOString()).toBe("2026-01-15T10:30:00.000Z");
    });

    it("throws BAD_USER_INPUT for a malformed string", () => {
      expect(() => DateTimeScalar.parseValue("not-a-date")).toThrow(GraphQLError);
      try {
        DateTimeScalar.parseValue("not-a-date");
      } catch (error) {
        expect((error as GraphQLError).extensions?.code).toBe("BAD_USER_INPUT");
      }
    });

    it("throws BAD_USER_INPUT for a non-string value", () => {
      expect(() => DateTimeScalar.parseValue(42)).toThrow(GraphQLError);
    });
  });

  describe("parseLiteral", () => {
    it("parses a string literal into a real Date", () => {
      const result = DateTimeScalar.parseLiteral({
        kind: Kind.STRING,
        value: "2026-01-15T10:30:00.000Z",
      });

      expect(result).toBeInstanceOf(Date);
      expect(result.toISOString()).toBe("2026-01-15T10:30:00.000Z");
    });

    it("throws BAD_USER_INPUT for a malformed string literal", () => {
      expect(() =>
        DateTimeScalar.parseLiteral({
          kind: Kind.STRING,
          value: "not-a-date",
        }),
      ).toThrow(GraphQLError);
    });

    it("throws BAD_USER_INPUT for a non-string literal (e.g. int)", () => {
      expect(() =>
        DateTimeScalar.parseLiteral({
          kind: Kind.INT,
          value: "42",
        }),
      ).toThrow(GraphQLError);
    });
  });
});
