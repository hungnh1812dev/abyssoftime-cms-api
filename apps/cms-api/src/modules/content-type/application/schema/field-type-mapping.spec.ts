import { FieldDefinition } from "../../domain/entities/field-definition";

import { columnTypeFor } from "./field-type-mapping";

function field(type: FieldDefinition["type"]): FieldDefinition {
  return { name: "f", type };
}

describe("columnTypeFor", () => {
  it("maps text to TEXT", () => {
    expect(columnTypeFor(field("text"))).toBe("TEXT");
  });

  it("maps richtext to TEXT", () => {
    expect(columnTypeFor(field("richtext"))).toBe("TEXT");
  });

  it("maps number to DOUBLE PRECISION", () => {
    expect(columnTypeFor(field("number"))).toBe("DOUBLE PRECISION");
  });

  it("maps boolean to BOOLEAN", () => {
    expect(columnTypeFor(field("boolean"))).toBe("BOOLEAN");
  });

  it("maps media to a TEXT FK against media_assets (media_assets.document_id is Prisma String/TEXT, not UUID)", () => {
    expect(columnTypeFor(field("media"))).toBe("TEXT REFERENCES media_assets(document_id) ON DELETE SET NULL");
  });

  it("maps json to JSONB", () => {
    expect(columnTypeFor(field("json"))).toBe("JSONB");
  });

  it("yields no column for component fields", () => {
    expect(columnTypeFor(field("component"))).toBeNull();
  });
});
