import { createHash } from "node:crypto";

import { assertSafeFieldName, assertSafeSlug } from "./sql-identifier";

const MAX_POSTGRES_IDENTIFIER_LENGTH = 63;
const HASH_SUFFIX_LENGTH = 8;

function slugToUnderscored(slug: string): string {
  return slug.replace(/-/g, "_");
}

export function documentTableName(slug: string): string {
  assertSafeSlug(slug);
  return `documents_${slugToUnderscored(slug)}`;
}

export function componentTableName(slug: string, path: string[]): string {
  assertSafeSlug(slug);
  path.forEach((segment) => assertSafeFieldName(segment));

  const prefix = `components_${slugToUnderscored(slug)}__`;
  const pathSegment = path.join("_");
  const fullName = `${prefix}${pathSegment}`;

  if (fullName.length <= MAX_POSTGRES_IDENTIFIER_LENGTH) {
    return fullName;
  }

  const hash = createHash("sha256").update(fullName).digest("hex").slice(0, HASH_SUFFIX_LENGTH);
  const suffix = `_${hash}`;
  const availableForPath = MAX_POSTGRES_IDENTIFIER_LENGTH - prefix.length - suffix.length;

  return `${prefix}${pathSegment.slice(0, availableForPath)}${suffix}`;
}
