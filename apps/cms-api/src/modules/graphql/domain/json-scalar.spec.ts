import { Kind } from "graphql";

import { JSONScalar } from "./json-scalar";

describe("JSONScalar", () => {
  it("is named JSON", () => {
    expect(JSONScalar.name).toBe("JSON");
  });

  describe("serialize", () => {
    it("passes arrays, objects, primitives, and null through unchanged", () => {
      expect(JSONScalar.serialize(["a", "b"])).toEqual(["a", "b"]);
      expect(JSONScalar.serialize({ a: 1 })).toEqual({ a: 1 });
      expect(JSONScalar.serialize("text")).toBe("text");
      expect(JSONScalar.serialize(42)).toBe(42);
      expect(JSONScalar.serialize(null)).toBeNull();
    });
  });

  describe("parseValue", () => {
    it("passes the input value through unchanged", () => {
      expect(JSONScalar.parseValue({ a: 1 })).toEqual({ a: 1 });
    });
  });

  describe("parseLiteral", () => {
    it("parses a list literal into a real array", () => {
      const result = JSONScalar.parseLiteral({
        kind: Kind.LIST,
        values: [
          { kind: Kind.STRING, value: "a" },
          { kind: Kind.INT, value: "1" },
        ],
      });

      expect(result).toEqual(["a", 1]);
    });

    it("parses an object literal into a real plain object", () => {
      const result = JSONScalar.parseLiteral({
        kind: Kind.OBJECT,
        fields: [{ kind: Kind.OBJECT_FIELD, name: { kind: Kind.NAME, value: "featured" }, value: { kind: Kind.BOOLEAN, value: true } }],
      });

      expect(result).toEqual({ featured: true });
    });

    it("parses a null literal to null", () => {
      expect(JSONScalar.parseLiteral({ kind: Kind.NULL })).toBeNull();
    });

    it("parses a float literal into a real number", () => {
      expect(JSONScalar.parseLiteral({ kind: Kind.FLOAT, value: "1.5" })).toBe(1.5);
    });
  });
});
