import { assertSafeFieldName, assertSafeSlug, quoteIdent, UnsafeSqlIdentifierError } from "./sql-identifier";

describe("assertSafeSlug", () => {
  it("accepts valid lowercase hyphenated slugs", () => {
    expect(assertSafeSlug("cv-page")).toBe("cv-page");
    expect(assertSafeSlug("en-it-vocab")).toBe("en-it-vocab");
    expect(assertSafeSlug("a")).toBe("a");
  });

  it("rejects an injection attempt", () => {
    expect(() => assertSafeSlug("slug; DROP TABLE")).toThrow(UnsafeSqlIdentifierError);
  });

  it("rejects an empty string", () => {
    expect(() => assertSafeSlug("")).toThrow(UnsafeSqlIdentifierError);
  });

  it("rejects a slug over 53 characters", () => {
    const tooLong = "a".repeat(54);

    expect(() => assertSafeSlug(tooLong)).toThrow(UnsafeSqlIdentifierError);
  });

  it("accepts a slug at exactly 53 characters", () => {
    const maxLength = "a".repeat(53);

    expect(assertSafeSlug(maxLength)).toBe(maxLength);
  });

  it("rejects uppercase characters", () => {
    expect(() => assertSafeSlug("CV-Page")).toThrow(UnsafeSqlIdentifierError);
  });

  it("rejects a leading or trailing hyphen", () => {
    expect(() => assertSafeSlug("-cv-page")).toThrow(UnsafeSqlIdentifierError);
    expect(() => assertSafeSlug("cv-page-")).toThrow(UnsafeSqlIdentifierError);
  });

  it("rejects unicode characters", () => {
    expect(() => assertSafeSlug("cv-pagé")).toThrow(UnsafeSqlIdentifierError);
  });
});

describe("assertSafeFieldName", () => {
  it("accepts valid camelCase field names", () => {
    expect(assertSafeFieldName("wordGroup")).toBe("wordGroup");
    expect(assertSafeFieldName("isMain")).toBe("isMain");
    expect(assertSafeFieldName("techStack")).toBe("techStack");
  });

  it("rejects a leading-digit field name", () => {
    expect(() => assertSafeFieldName("1field")).toThrow(UnsafeSqlIdentifierError);
  });

  it("rejects a hyphenated field name", () => {
    expect(() => assertSafeFieldName("word-group")).toThrow(UnsafeSqlIdentifierError);
  });

  it("rejects an empty string", () => {
    expect(() => assertSafeFieldName("")).toThrow(UnsafeSqlIdentifierError);
  });

  it("rejects a field name over 53 characters", () => {
    const tooLong = "a".repeat(54);

    expect(() => assertSafeFieldName(tooLong)).toThrow(UnsafeSqlIdentifierError);
  });

  it("rejects unicode characters", () => {
    expect(() => assertSafeFieldName("wördGroup")).toThrow(UnsafeSqlIdentifierError);
  });
});

describe("quoteIdent", () => {
  it("wraps a safe identifier in double quotes", () => {
    expect(quoteIdent("wordGroup")).toBe('"wordGroup"');
  });

  it("wraps a safe underscored table name in double quotes", () => {
    expect(quoteIdent("documents_cv_page")).toBe('"documents_cv_page"');
  });

  it("rejects an identifier carrying an embedded quote instead of emitting breakable SQL", () => {
    expect(() => quoteIdent('word"Group')).toThrow(UnsafeSqlIdentifierError);
  });

  it("rejects an identifier that is not a safe SQL identifier shape", () => {
    expect(() => quoteIdent("slug; DROP TABLE")).toThrow(UnsafeSqlIdentifierError);
  });
});
