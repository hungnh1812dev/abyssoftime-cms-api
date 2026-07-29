function toPascalCase(slug: string): string {
  return slug
    .split(/[-_]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("");
}

function toCamelCase(slug: string): string {
  const pascal = toPascalCase(slug);
  return pascal.charAt(0).toLowerCase() + pascal.slice(1);
}

export function typeName(slug: string): string {
  return toPascalCase(slug);
}

export function queryName(slug: string): string {
  return toCamelCase(slug);
}

export function listQueryName(slug: string): string {
  return `${queryName(slug)}List`;
}

export function inputTypeName(slug: string): string {
  return `${typeName(slug)}Input`;
}

export function filterTypeName(slug: string): string {
  return `${typeName(slug)}Filter`;
}

export function orderByTypeName(slug: string): string {
  return `${typeName(slug)}OrderBy`;
}

export function componentTypeName(contentTypeSlug: string, componentName: string): string {
  return `${typeName(contentTypeSlug)}${toPascalCase(componentName)}`;
}
