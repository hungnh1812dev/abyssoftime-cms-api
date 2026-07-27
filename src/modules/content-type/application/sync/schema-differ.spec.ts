import { FieldDefinition } from "../../domain/entities/field-definition";
import { LiveColumn } from "../../domain/repositories/schema-table.repository";

import { diffColumns, diffComponentTables } from "./schema-differ";

function liveColumn(name: string, dataType: string, isNullable = true): LiveColumn {
  return { name, dataType, isNullable };
}

describe("diffColumns", () => {
  it("adds a column for a newly desired field", () => {
    const plan = diffColumns([], [{ name: "wordGroup", type: "text" }]);

    expect(plan.addColumns).toEqual([{ name: "wordGroup", columnType: "TEXT" }]);
    expect(plan.dropColumns).toEqual([]);
    expect(plan.retypeColumns).toEqual([]);
  });

  it("drops a live column that is no longer desired, leaving other columns untouched", () => {
    const live = [liveColumn("wordGroup", "text"), liveColumn("isMain", "boolean")];
    const desired: FieldDefinition[] = [{ name: "wordGroup", type: "text" }];

    const plan = diffColumns(live, desired);

    expect(plan.dropColumns).toEqual(["isMain"]);
    expect(plan.addColumns).toEqual([]);
    expect(plan.retypeColumns).toEqual([]);
  });

  it("never touches system columns even when they are not part of desiredFields", () => {
    const live = [
      liveColumn("id", "bigint"),
      liveColumn("document_id", "uuid"),
      liveColumn("version", "character varying"),
      liveColumn("created_at", "timestamp with time zone"),
      liveColumn("updated_at", "timestamp with time zone"),
      liveColumn("published_at", "timestamp with time zone"),
      liveColumn("created_by", "uuid"),
      liveColumn("updated_by", "uuid"),
      liveColumn("published_by", "uuid"),
      liveColumn("wordGroup", "text"),
    ];
    const desired: FieldDefinition[] = [{ name: "wordGroup", type: "text" }];

    const plan = diffColumns(live, desired);

    expect(plan.dropColumns).toEqual([]);
  });

  it("retypes with a safe cast when the new type is text", () => {
    const live = [liveColumn("teamSize", "double precision")];
    const desired: FieldDefinition[] = [{ name: "teamSize", type: "text" }];

    const plan = diffColumns(live, desired);

    expect(plan.retypeColumns).toEqual([{ name: "teamSize", columnType: "TEXT" }]);
    expect(plan.addColumns).toEqual([]);
    expect(plan.dropColumns).toEqual([]);
  });

  it("falls back to drop+add for an incompatible type change", () => {
    const live = [liveColumn("wordGroup", "text")];
    const desired: FieldDefinition[] = [{ name: "wordGroup", type: "number" }];

    const plan = diffColumns(live, desired);

    expect(plan.dropColumns).toEqual(["wordGroup"]);
    expect(plan.addColumns).toEqual([{ name: "wordGroup", columnType: "DOUBLE PRECISION" }]);
    expect(plan.retypeColumns).toEqual([]);
  });

  it("produces no column ops for component fields", () => {
    const desired: FieldDefinition[] = [{ name: "experiences", type: "component", component: "experience", repeatable: true, fields: [] }];

    const plan = diffColumns([], desired);

    expect(plan.addColumns).toEqual([]);
  });

  it("produces an empty plan for an identical schema", () => {
    const live = [liveColumn("wordGroup", "text"), liveColumn("isMain", "boolean")];
    const desired: FieldDefinition[] = [
      { name: "wordGroup", type: "text" },
      { name: "isMain", type: "boolean" },
    ];

    const plan = diffColumns(live, desired);

    expect(plan).toEqual({ addColumns: [], dropColumns: [], retypeColumns: [] });
  });
});

describe("diffComponentTables", () => {
  it("plans to add a table for a newly added component field", () => {
    const desired: FieldDefinition[] = [{ name: "experiences", type: "component", component: "experience", repeatable: true, fields: [] }];

    const plan = diffComponentTables([], desired);

    expect(plan.addPaths).toEqual([["experience"]]);
    expect(plan.dropPaths).toEqual([]);
  });

  it("plans to drop a table for a removed component field", () => {
    const previous: FieldDefinition[] = [{ name: "experiences", type: "component", component: "experience", repeatable: true, fields: [] }];

    const plan = diffComponentTables(previous, []);

    expect(plan.dropPaths).toEqual([["experience"]]);
    expect(plan.addPaths).toEqual([]);
  });

  it("collects nested 3-level component paths (cv-page experience.role shape)", () => {
    const desired: FieldDefinition[] = [
      {
        name: "experiences",
        type: "component",
        component: "experience",
        repeatable: true,
        fields: [
          {
            name: "roles",
            type: "component",
            component: "role",
            repeatable: true,
            fields: [],
          },
        ],
      },
    ];

    const plan = diffComponentTables([], desired);

    expect(plan.addPaths).toEqual([["experience"], ["experience", "role"]]);
  });

  it("collects nested component paths (en-it-vocab phonetic.syllablePart shape)", () => {
    const desired: FieldDefinition[] = [
      {
        name: "phonetics",
        type: "component",
        component: "phonetic",
        repeatable: true,
        fields: [
          {
            name: "syllableParts",
            type: "component",
            component: "syllablePart",
            repeatable: true,
            fields: [],
          },
        ],
      },
    ];

    const plan = diffComponentTables([], desired);

    expect(plan.addPaths).toEqual([["phonetic"], ["phonetic", "syllablePart"]]);
  });

  it("produces an empty plan when the component shape is unchanged", () => {
    const fields: FieldDefinition[] = [{ name: "experiences", type: "component", component: "experience", repeatable: true, fields: [] }];

    const plan = diffComponentTables(fields, fields);

    expect(plan).toEqual({ addPaths: [], dropPaths: [] });
  });
});
