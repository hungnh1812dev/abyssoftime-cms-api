import { FieldDefinition } from "@/modules/content-type/domain/entities/field-definition";

import { graphqlTypeFor } from "./field-type-mapping";

function field(type: FieldDefinition["type"]): FieldDefinition {
  return { name: "f", type };
}

describe("graphqlTypeFor", () => {
  it("maps text to String", () => {
    expect(graphqlTypeFor(field("text"))).toBe("String");
  });

  it("maps richtext to String", () => {
    expect(graphqlTypeFor(field("richtext"))).toBe("String");
  });

  it("maps number to Float", () => {
    expect(graphqlTypeFor(field("number"))).toBe("Float");
  });

  it("maps boolean to Boolean", () => {
    expect(graphqlTypeFor(field("boolean"))).toBe("Boolean");
  });

  it("maps media to MediaAsset", () => {
    expect(graphqlTypeFor(field("media"))).toBe("MediaAsset");
  });

  it("maps json to JSON", () => {
    expect(graphqlTypeFor(field("json"))).toBe("JSON");
  });

  it("yields no type for component fields (caller derives the nested type name)", () => {
    expect(graphqlTypeFor(field("component"))).toBeNull();
  });
});
