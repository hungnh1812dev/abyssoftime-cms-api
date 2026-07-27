import { UnsafeSqlIdentifierError } from "@/modules/content-type/application/schema/sql-identifier";
import { FieldDefinition } from "@/modules/content-type/domain/entities/field-definition";

import { buildOrderByClause, buildSearchWhere, escapeSearchValue, InvalidOrderByFieldError, sortableColumnsFor } from "./where-builder";

describe("buildOrderByClause", () => {
  const ALLOWED = ["id", "created_at", "wordGroup", "isMain"];

  it("builds an ascending ORDER BY clause for an allowed column", () => {
    expect(buildOrderByClause("wordGroup", "asc", ALLOWED)).toBe('ORDER BY "wordGroup" ASC');
  });

  it("builds a descending ORDER BY clause for an allowed column", () => {
    expect(buildOrderByClause("isMain", "desc", ALLOWED)).toBe('ORDER BY "isMain" DESC');
  });

  it("allows system columns present in the allowlist", () => {
    expect(buildOrderByClause("created_at", "desc", ALLOWED)).toBe('ORDER BY "created_at" DESC');
  });

  it("rejects a column not present in the allowlist", () => {
    expect(() => buildOrderByClause("techStack", "asc", ALLOWED)).toThrow(InvalidOrderByFieldError);
  });

  it("rejects an injection attempt even if it slipped into the allowlist", () => {
    expect(() => buildOrderByClause('wordGroup"; DROP TABLE users; --', "asc", [...ALLOWED, 'wordGroup"; DROP TABLE users; --'])).toThrow(UnsafeSqlIdentifierError);
  });
});

describe("escapeSearchValue", () => {
  it("escapes backslash, percent, and underscore", () => {
    expect(escapeSearchValue("50%_off\\deal")).toBe("50\\%\\_off\\\\deal");
  });

  it("leaves ordinary text untouched", () => {
    expect(escapeSearchValue("hello world")).toBe("hello world");
  });
});

describe("buildSearchWhere", () => {
  const SEARCHABLE = ["wordGroup", "translation"];

  it("returns null for an undefined search value", () => {
    expect(buildSearchWhere(undefined, SEARCHABLE, 1)).toBeNull();
  });

  it("returns null for an empty search value", () => {
    expect(buildSearchWhere("", SEARCHABLE, 1)).toBeNull();
  });

  it("returns null when there are no searchable columns", () => {
    expect(buildSearchWhere("hello", [], 1)).toBeNull();
  });

  it("ORs an ILIKE clause across every searchable column, sharing one placeholder", () => {
    const result = buildSearchWhere("hello", SEARCHABLE, 1);

    expect(result).toEqual({
      sql: `("wordGroup" ILIKE $1 ESCAPE '\\' OR "translation" ILIKE $1 ESCAPE '\\')`,
      params: ["%hello%"],
    });
  });

  it("wraps the escaped value in wildcards and offsets the placeholder index", () => {
    const result = buildSearchWhere("50%_off", SEARCHABLE, 3);

    expect(result).toEqual({
      sql: `("wordGroup" ILIKE $3 ESCAPE '\\' OR "translation" ILIKE $3 ESCAPE '\\')`,
      params: ["%50\\%\\_off%"],
    });
  });

  it("re-validates searchable column names as a defence-in-depth check", () => {
    expect(() => buildSearchWhere("hello", ['wordGroup"; DROP TABLE users; --'], 1)).toThrow(UnsafeSqlIdentifierError);
  });
});

describe("sortableColumnsFor", () => {
  it("always includes the system columns", () => {
    expect(sortableColumnsFor([])).toEqual(["id", "document_id", "created_at", "updated_at", "published_at"]);
  });

  it("includes text, number, and boolean content fields", () => {
    const fields: FieldDefinition[] = [
      { name: "wordGroup", type: "text" },
      { name: "teamSize", type: "number" },
      { name: "isMain", type: "boolean" },
    ];

    expect(sortableColumnsFor(fields)).toEqual(expect.arrayContaining(["wordGroup", "teamSize", "isMain"]));
  });

  it("excludes richtext, media, json, and component fields", () => {
    const fields: FieldDefinition[] = [
      { name: "bio", type: "richtext" },
      { name: "avatar", type: "media" },
      { name: "techStack", type: "json" },
      { name: "roles", type: "component", component: "role", repeatable: true, fields: [] },
    ];

    expect(sortableColumnsFor(fields)).toEqual(["id", "document_id", "created_at", "updated_at", "published_at"]);
  });
});
