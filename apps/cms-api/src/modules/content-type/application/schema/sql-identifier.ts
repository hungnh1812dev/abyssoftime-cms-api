const MAX_SLUG_OR_FIELD_NAME_LENGTH = 53;
const MAX_POSTGRES_IDENTIFIER_LENGTH = 63;

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const FIELD_NAME_PATTERN = /^[a-zA-Z][a-zA-Z0-9]*$/;
const SAFE_SQL_IDENTIFIER_PATTERN = /^[a-zA-Z_][a-zA-Z0-9_]*$/;

export class UnsafeSqlIdentifierError extends Error {
  constructor(kind: string, value: string) {
    super(`Unsafe SQL ${kind}: "${value}"`);
    this.name = "UnsafeSqlIdentifierError";
  }
}

export function assertSafeSlug(slug: string): string {
  if (slug.length < 1 || slug.length > MAX_SLUG_OR_FIELD_NAME_LENGTH || !SLUG_PATTERN.test(slug)) {
    throw new UnsafeSqlIdentifierError("slug", slug);
  }
  return slug;
}

export function assertSafeFieldName(name: string): string {
  if (name.length < 1 || name.length > MAX_SLUG_OR_FIELD_NAME_LENGTH || !FIELD_NAME_PATTERN.test(name)) {
    throw new UnsafeSqlIdentifierError("field name", name);
  }
  return name;
}

export function quoteIdent(name: string): string {
  if (name.length < 1 || name.length > MAX_POSTGRES_IDENTIFIER_LENGTH || !SAFE_SQL_IDENTIFIER_PATTERN.test(name)) {
    throw new UnsafeSqlIdentifierError("identifier", name);
  }
  return `"${name.replace(/"/g, '""')}"`;
}
