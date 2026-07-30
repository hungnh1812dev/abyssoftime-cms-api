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

export function componentInputTypeName(contentTypeSlug: string, componentName: string): string {
  return `${componentTypeName(contentTypeSlug, componentName)}Input`;
}

export function createMutationName(slug: string): string {
  return `create${typeName(slug)}`;
}

export function updateMutationName(slug: string): string {
  return `update${typeName(slug)}`;
}

export function deleteMutationName(slug: string): string {
  return `delete${typeName(slug)}`;
}

export function publishMutationName(slug: string): string {
  return `publish${typeName(slug)}`;
}

export function unpublishMutationName(slug: string): string {
  return `unpublish${typeName(slug)}`;
}

export function saveMutationName(slug: string): string {
  return `save${typeName(slug)}`;
}
