import { FieldDefinition } from "@/modules/content-type/domain/entities/field-definition";

import { fieldsToRowValues, mapRowToComponent, mapRowToDocument } from "./row-mapper";

const FIELDS: FieldDefinition[] = [
  { name: "wordGroup", type: "text" },
  { name: "isMain", type: "boolean" },
  { name: "techStack", type: "json" },
  { name: "roles", type: "component", component: "role", repeatable: true, fields: [] },
];

describe("mapRowToDocument", () => {
  it("builds a DocumentEntity from system columns + scalar field columns", () => {
    const createdAt = new Date("2026-01-01T00:00:00Z");
    const updatedAt = new Date("2026-01-02T00:00:00Z");
    const publishedAt = new Date("2026-01-03T00:00:00Z");

    const doc = mapRowToDocument(
      {
        document_id: "doc-1",
        version: "draft",
        wordGroup: "greetings",
        isMain: true,
        techStack: { a: 1 },
        created_at: createdAt,
        updated_at: updatedAt,
        published_at: publishedAt,
        created_by: "user-1",
        updated_by: "user-2",
        published_by: "user-3",
      },
      FIELDS,
    );

    expect(doc.documentId).toBe("doc-1");
    expect(doc.version).toBe("draft");
    expect(doc.fields).toEqual({ wordGroup: "greetings", isMain: true, techStack: { a: 1 } });
    expect(doc.createdAt).toBe(createdAt);
    expect(doc.updatedAt).toBe(updatedAt);
    expect(doc.publishedAt).toBe(publishedAt);
    expect(doc.createdBy).toBe("user-1");
    expect(doc.updatedBy).toBe("user-2");
    expect(doc.publishedBy).toBe("user-3");
  });

  it("skips component fields when extracting the fields map", () => {
    const doc = mapRowToDocument(
      {
        document_id: "doc-1",
        version: "draft",
        wordGroup: "greetings",
        isMain: null,
        techStack: null,
        created_at: new Date(),
        updated_at: new Date(),
        published_at: null,
        created_by: null,
        updated_by: null,
        published_by: null,
      },
      FIELDS,
    );

    expect(Object.keys(doc.fields)).toEqual(["wordGroup", "isMain", "techStack"]);
  });

  it("parses a JSON-typed column when the driver returns it as a raw string", () => {
    const doc = mapRowToDocument(
      {
        document_id: "doc-1",
        version: "draft",
        wordGroup: null,
        isMain: null,
        techStack: '{"a":1}',
        created_at: new Date(),
        updated_at: new Date(),
        published_at: null,
        created_by: null,
        updated_by: null,
        published_by: null,
      },
      FIELDS,
    );

    expect(doc.fields.techStack).toEqual({ a: 1 });
  });

  it("defaults a missing field column to null", () => {
    const doc = mapRowToDocument(
      {
        document_id: "doc-1",
        version: "draft",
        created_at: new Date(),
        updated_at: new Date(),
        published_at: null,
        created_by: null,
        updated_by: null,
        published_by: null,
      },
      FIELDS,
    );

    expect(doc.fields).toEqual({ wordGroup: null, isMain: null, techStack: null });
  });
});

describe("mapRowToComponent", () => {
  it("builds a ComponentEntity with empty children and passes parentComponentId through", () => {
    const component = mapRowToComponent(
      {
        component_id: "comp-1",
        document_id: "doc-1",
        version: "published",
        parent_component_id: "comp-0",
        level: "senior",
      },
      [{ name: "level", type: "text" }],
    );

    expect(component.componentId).toBe("comp-1");
    expect(component.documentId).toBe("doc-1");
    expect(component.version).toBe("published");
    expect(component.parentComponentId).toBe("comp-0");
    expect(component.fields).toEqual({ level: "senior" });
    expect(component.children).toEqual({});
  });

  it("maps a root-level component's null parent_component_id to null", () => {
    const component = mapRowToComponent({ component_id: "comp-1", document_id: "doc-1", version: "draft", parent_component_id: null }, []);

    expect(component.parentComponentId).toBeNull();
  });
});

describe("fieldsToRowValues", () => {
  it("extracts scalar field values keyed by field name", () => {
    expect(fieldsToRowValues({ wordGroup: "greetings", isMain: true }, FIELDS)).toEqual({
      wordGroup: "greetings",
      isMain: true,
      techStack: null,
    });
  });

  it("JSON-stringifies json-typed field values", () => {
    expect(fieldsToRowValues({ techStack: ["react", "nest"] }, FIELDS)).toMatchObject({
      techStack: JSON.stringify(["react", "nest"]),
    });
  });

  it("defaults a missing value to null", () => {
    expect(fieldsToRowValues({}, FIELDS)).toEqual({ wordGroup: null, isMain: null, techStack: null });
  });

  it("skips component fields", () => {
    expect(fieldsToRowValues({ roles: [{}] }, FIELDS)).not.toHaveProperty("roles");
  });
});
