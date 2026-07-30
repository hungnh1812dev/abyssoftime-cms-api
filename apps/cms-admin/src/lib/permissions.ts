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
