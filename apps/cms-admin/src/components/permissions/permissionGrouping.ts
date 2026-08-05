import type { PermissionItem } from "@/hooks/usePermissions";

export function resourceOf(slug: string): string {
  return slug.split(":")[0] ?? slug;
}

export function groupByResource(permissions: PermissionItem[]): Array<[string, PermissionItem[]]> {
  const groups = new Map<string, PermissionItem[]>();
  for (const p of permissions) {
    const resource = resourceOf(p.slug);
    const list = groups.get(resource) ?? [];
    list.push(p);
    groups.set(resource, list);
  }
  return [...groups.entries()].sort(([a], [b]) => a.localeCompare(b));
}

export interface ParsedDocumentPermissionSlug {
  action: string;
  contentTypeSlug?: string;
}

export function parseDocumentPermissionSlug(slug: string): ParsedDocumentPermissionSlug | null {
  const segments = slug.split(":");
  if (segments[0] !== "document") return null;
  if (segments.length === 2) return { action: segments[1] };
  if (segments.length === 3) return { action: segments[1], contentTypeSlug: segments[2] };
  return null;
}

export function buildDocumentPermissionSlug(action: string, contentTypeSlug?: string): string {
  return contentTypeSlug ? `document:${action}:${contentTypeSlug}` : `document:${action}`;
}
