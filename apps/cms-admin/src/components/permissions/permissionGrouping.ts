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
