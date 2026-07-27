import { FieldDefinition, isComponentField } from "./field-definition";

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
