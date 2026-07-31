import { UnsafeSqlIdentifierError } from "@/modules/content-type/application/schema/sql-identifier";
import { FieldDefinition } from "@/modules/content-type/domain/entities/field-definition";

import { buildFilterWhere, buildOrderByClause, buildSearchWhere, escapeSearchValue, InvalidOrderByFieldError, ParsedFilter, sortableColumnsFor } from "./where-builder";

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

describe("buildFilterWhere", () => {
  it("returns null for an empty filters array", () => {
    expect(buildFilterWhere([], 1)).toBeNull();
  });

  it("builds a single $eq clause with a raw value param", () => {
    const filters: ParsedFilter[] = [{ column: "status", operator: "$eq", value: "active" }];

    expect(buildFilterWhere(filters, 2)).toEqual({
      sql: '("status" = $2)',
      params: ["active"],
    });
  });

  it("maps every comparison operator to its SQL operator", () => {
    expect(buildFilterWhere([{ column: "age", operator: "$ne", value: 18 }], 1)).toEqual({ sql: '("age" <> $1)', params: [18] });
    expect(buildFilterWhere([{ column: "age", operator: "$gt", value: 18 }], 1)).toEqual({ sql: '("age" > $1)', params: [18] });
    expect(buildFilterWhere([{ column: "age", operator: "$gte", value: 18 }], 1)).toEqual({ sql: '("age" >= $1)', params: [18] });
    expect(buildFilterWhere([{ column: "age", operator: "$lt", value: 18 }], 1)).toEqual({ sql: '("age" < $1)', params: [18] });
    expect(buildFilterWhere([{ column: "age", operator: "$lte", value: 18 }], 1)).toEqual({ sql: '("age" <= $1)', params: [18] });
  });

  it("builds an escaped, wildcarded ILIKE clause for $contains", () => {
    const filters: ParsedFilter[] = [{ column: "title", operator: "$contains", value: "50%_off" }];

    expect(buildFilterWhere(filters, 3)).toEqual({
      sql: `("title" ILIKE $3 ESCAPE '\\')`,
      params: ["%50\\%\\_off%"],
    });
  });

  it("AND-joins multiple filters with sequential placeholder indices", () => {
    const filters: ParsedFilter[] = [
      { column: "status", operator: "$eq", value: "active" },
      { column: "age", operator: "$gte", value: 18 },
    ];

    expect(buildFilterWhere(filters, 5)).toEqual({
      sql: '("status" = $5 AND "age" >= $6)',
      params: ["active", 18],
    });
  });

  it("re-validates the column name as a defence-in-depth check", () => {
    const filters: ParsedFilter[] = [{ column: 'status"; DROP TABLE users; --', operator: "$eq", value: "active" }];

    expect(() => buildFilterWhere(filters, 1)).toThrow(UnsafeSqlIdentifierError);
  });

  it("builds an = ANY($n) clause for $in with an array param", () => {
    const filters: ParsedFilter[] = [{ column: "documentId", operator: "$in", value: ["a", "b"] }];

    expect(buildFilterWhere(filters, 1)).toEqual({
      sql: '("documentId" = ANY($1))',
      params: [["a", "b"]],
    });
  });

  it("builds a NOT (= ANY($n)) clause for $notIn with an array param", () => {
    const filters: ParsedFilter[] = [{ column: "documentId", operator: "$notIn", value: ["a", "b"] }];

    expect(buildFilterWhere(filters, 1)).toEqual({
      sql: '(NOT ("documentId" = ANY($1)))',
      params: [["a", "b"]],
    });
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
