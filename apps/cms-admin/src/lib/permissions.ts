import { useAuth } from "@/hooks/useAuth";

/**
 * Mirrors `PermissionsGuard.managerEquivalentOf` in abyssoftime-cms-api: a
 * `:manager` permission satisfies the corresponding `:read` requirement, so
 * a role with only `media:manager` (no explicit `media:read`) can still
 * call GET endpoints gated on `media:read`. Client-side gating must apply
 * the same equivalence or it hides UI the backend would actually allow.
 */
export function hasPermission(granted: string[], required: string): boolean {
  const set = new Set(granted);
  if (set.has(required)) return true;
  if (required.endsWith(":read")) return set.has(required.replace(/:read$/, ":manager"));
  return false;
}

/**
 * Mirrors `isDocumentActionGranted` in abyssoftime-cms-api
 * (`src/common/authorization/document-permission.util.ts`) exactly: a bare
 * `document:<action>` grant covers every content type, while a
 * `document:<action>:<slug>` grant only covers that one content type.
 */
export function hasDocumentPermission(granted: string[], action: string, contentTypeSlug: string): boolean {
  const requiredSlug = `document:${action}`;
  return granted.includes(requiredSlug) || granted.includes(`${requiredSlug}:${contentTypeSlug}`);
}

export interface PermissionGateResult {
  allowed: boolean;
  reason: string;
}

/**
 * Without `contentTypeSlug`, `required` is a full permission slug (e.g.
 * `role:manager`) checked via `hasPermission`. With it, `required` is a
 * document action base (e.g. `create`) checked via `hasDocumentPermission`.
 */
export function usePermissionGate(required: string, contentTypeSlug?: string): PermissionGateResult {
  const { permissions } = useAuth();

  if (contentTypeSlug === undefined) {
    return {
      allowed: hasPermission(permissions, required),
      reason: `Requires the "${required}" permission`,
    };
  }

  return {
    allowed: hasDocumentPermission(permissions, required, contentTypeSlug),
    reason: `Requires the "document:${required}" permission for this content type`,
  };
}
