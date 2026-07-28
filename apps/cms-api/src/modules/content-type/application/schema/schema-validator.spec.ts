import { ContentTypeDefinition } from "../../domain/entities/content-type.entity";

import { SchemaValidationError, validateContentTypeDefinition } from "./schema-validator";
import { UnsafeSqlIdentifierError } from "./sql-identifier";

function cvPageLikeDefinition(): ContentTypeDefinition {
  return {
    slug: "cv-page",
    name: "CV Page",
    kind: "collection",
    draftToPublish: true,
    fields: [
      { name: "position", type: "text" },
      { name: "isMain", type: "boolean" },
      { name: "company", type: "text" },
      { name: "summary", type: "richtext" },
      {
        name: "experiences",
        type: "component",
        component: "experience",
        repeatable: true,
        fields: [
          { name: "company", type: "text" },
          { name: "location", type: "text" },
          {
            name: "roles",
            type: "component",
            component: "role",
            repeatable: true,
            fields: [
              { name: "position", type: "text" },
              { name: "teamSize", type: "number" },
              { name: "techStack", type: "json" },
            ],
          },
        ],
      },
    ],
    listFields: ["position", "company", "summary"],
  };
}

function enItVocabLikeDefinition(): ContentTypeDefinition {
  return {
    slug: "en-it-vocab",
    name: "English IT Vocabulary",
    kind: "collection",
    draftToPublish: true,
    fields: [
      { name: "wordGroup", type: "text" },
      { name: "word", type: "text" },
      {
        name: "phonetics",
        type: "component",
        component: "phonetic",
        repeatable: true,
        fields: [
          { name: "ipa", type: "text" },
          {
            name: "syllableParts",
            type: "component",
            component: "syllablePart",
            repeatable: true,
            fields: [
              { name: "text", type: "text" },
              { name: "stressed", type: "boolean" },
            ],
          },
        ],
      },
    ],
  };
}

describe("validateContentTypeDefinition", () => {
  it("validates the cv-page 3-level nested shape cleanly", () => {
    expect(() => validateContentTypeDefinition(cvPageLikeDefinition())).not.toThrow();
  });

  it("validates the en-it-vocab 3-level nested shape cleanly", () => {
    expect(() => validateContentTypeDefinition(enItVocabLikeDefinition())).not.toThrow();
  });

  it("throws on an unsafe slug", () => {
    const definition = { ...cvPageLikeDefinition(), slug: "CV Page!" };

    expect(() => validateContentTypeDefinition(definition)).toThrow(UnsafeSqlIdentifierError);
  });

  it("throws on an unsafe top-level field name", () => {
    const definition = cvPageLikeDefinition();
    definition.fields[0] = { name: "1position", type: "text" };

    expect(() => validateContentTypeDefinition(definition)).toThrow(UnsafeSqlIdentifierError);
  });

  it("throws on an unsafe nested component field name", () => {
    const definition = cvPageLikeDefinition();
    const experiences = definition.fields.find((field) => field.name === "experiences")!;
    experiences.fields![0] = { name: "bad-name", type: "text" };

    expect(() => validateContentTypeDefinition(definition)).toThrow(UnsafeSqlIdentifierError);
  });

  it("throws on an unsafe component declared name", () => {
    const definition = cvPageLikeDefinition();
    const experiences = definition.fields.find((field) => field.name === "experiences")!;
    experiences.component = "bad-component";

    expect(() => validateContentTypeDefinition(definition)).toThrow(UnsafeSqlIdentifierError);
  });

  it("throws when a field name collides with a reserved system column", () => {
    const definition = cvPageLikeDefinition();
    definition.fields.push({ name: "version", type: "text" });

    expect(() => validateContentTypeDefinition(definition)).toThrow(SchemaValidationError);
  });

  it("throws when listFields references an unknown field", () => {
    const definition = { ...cvPageLikeDefinition(), listFields: ["doesNotExist"] };

    expect(() => validateContentTypeDefinition(definition)).toThrow(SchemaValidationError);
  });

  it("accepts a definition with no listFields (default applied elsewhere)", () => {
    const definition = { ...cvPageLikeDefinition(), listFields: undefined };

    expect(() => validateContentTypeDefinition(definition)).not.toThrow();
  });
});
