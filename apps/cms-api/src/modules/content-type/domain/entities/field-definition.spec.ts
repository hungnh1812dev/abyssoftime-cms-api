import { FieldDefinition, isComponentField, LISTABLE_FIELD_TYPES, LISTABLE_SYSTEM_COLUMNS } from "./field-definition";

describe("isComponentField", () => {
  it("returns true for a component field", () => {
    const field: FieldDefinition = { name: "experiences", type: "component", component: "experience", repeatable: true, fields: [] };

    expect(isComponentField(field)).toBe(true);
  });

  it("returns false for a non-component field", () => {
    const field: FieldDefinition = { name: "wordGroup", type: "text" };

    expect(isComponentField(field)).toBe(false);
  });
});

describe("LISTABLE_FIELD_TYPES", () => {
  it("contains exactly text, number, and boolean", () => {
    expect(LISTABLE_FIELD_TYPES).toEqual(new Set(["text", "number", "boolean"]));
  });
});

describe("LISTABLE_SYSTEM_COLUMNS", () => {
  it("contains exactly the response-DTO-facing system column names", () => {
    expect(LISTABLE_SYSTEM_COLUMNS).toEqual(["id", "documentId", "status", "createdAt", "updatedAt", "publishedAt", "updatedBy"]);
  });
});
