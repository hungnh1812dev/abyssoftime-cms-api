import { UnsafeSqlIdentifierError } from "./sql-identifier";
import { componentTableName, documentTableName } from "./table-naming";

describe("documentTableName", () => {
  it("derives the document table name from a hyphenated slug", () => {
    expect(documentTableName("cv-page")).toBe("documents_cv_page");
    expect(documentTableName("en-it-vocab")).toBe("documents_en_it_vocab");
  });

  it("rejects an unsafe slug", () => {
    expect(() => documentTableName("cv page")).toThrow(UnsafeSqlIdentifierError);
  });
});

describe("componentTableName", () => {
  it("derives the cv-page experience.roles component table name", () => {
    expect(componentTableName("cv-page", ["experience", "role"])).toBe("components_cv_page__experience_role");
  });

  it("derives the en-it-vocab phonetic.syllableParts component table name", () => {
    expect(componentTableName("en-it-vocab", ["phonetic", "syllablePart"])).toBe("components_en_it_vocab__phonetic_syllablePart");
  });

  it("deterministically truncates a path that would exceed 63 bytes, stably across calls", () => {
    const longPath = ["a".repeat(40), "b".repeat(40)];

    const first = componentTableName("cv-page", longPath);
    const second = componentTableName("cv-page", longPath);

    expect(first).toBe(second);
    expect(first.length).toBeLessThanOrEqual(63);
    expect(first.startsWith("components_cv_page__")).toBe(true);
  });

  it("rejects an unsafe slug or path segment", () => {
    expect(() => componentTableName("cv page", ["experience"])).toThrow(UnsafeSqlIdentifierError);
    expect(() => componentTableName("cv-page", ["experience; DROP TABLE"])).toThrow(UnsafeSqlIdentifierError);
  });
});
