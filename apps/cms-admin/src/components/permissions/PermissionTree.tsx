import { groupByResource } from "@/components/permissions/permissionGrouping";
import type { PermissionItem } from "@/hooks/usePermissions";

function TriStateCheckbox({ checked, indeterminate, onChange, label }: { checked: boolean; indeterminate: boolean; onChange: () => void; label: string }) {
  return (
    <label className="flex cursor-pointer items-center gap-2 text-sm font-medium">
      <input
        type="checkbox"
        checked={checked}
        ref={(el) => {
          if (el) el.indeterminate = indeterminate;
        }}
        onChange={onChange}
        className="rounded"
      />
      {label}
    </label>
  );
}

export interface PermissionTreeProps {
  permissions: PermissionItem[];
  selected: string[];
  onChange: (next: string[]) => void;
}

export function PermissionTree({ permissions, selected, onChange }: PermissionTreeProps) {
  const groups = groupByResource(permissions);
  const allSlugs = permissions.map((p) => p.slug);
  const allChecked = allSlugs.length > 0 && allSlugs.every((s) => selected.includes(s));
  const someChecked = allSlugs.some((s) => selected.includes(s));

  function toggle(slug: string) {
    onChange(selected.includes(slug) ? selected.filter((s) => s !== slug) : [...selected, slug]);
  }

  function toggleGroup(groupSlugs: string[]) {
    const groupAllChecked = groupSlugs.every((s) => selected.includes(s));
    onChange(groupAllChecked ? selected.filter((s) => !groupSlugs.includes(s)) : [...new Set([...selected, ...groupSlugs])]);
  }

  function toggleAll() {
    onChange(allChecked ? [] : allSlugs);
  }

  return (
    <div className="space-y-2">
      <TriStateCheckbox checked={allChecked} indeterminate={!allChecked && someChecked} onChange={toggleAll} label="Select All" />
      <div className="max-h-80 space-y-2 overflow-y-auto">
        {groups.map(([resource, perms]) => {
          const groupSlugs = perms.map((p) => p.slug);
          const groupAllChecked = groupSlugs.every((s) => selected.includes(s));
          const groupSomeChecked = groupSlugs.some((s) => selected.includes(s));
          return (
            <div key={resource} className="rounded-md border p-3">
              <TriStateCheckbox
                checked={groupAllChecked}
                indeterminate={!groupAllChecked && groupSomeChecked}
                onChange={() => toggleGroup(groupSlugs)}
                label={resource.replace(/_/g, " ")}
              />
              <div className="mt-2 ml-5 space-y-1 border-l pl-3">
                {perms.map((p) => (
                  <label key={p.slug} className="flex cursor-pointer items-center gap-2 text-sm">
                    <input type="checkbox" checked={selected.includes(p.slug)} onChange={() => toggle(p.slug)} className="rounded" />
                    <span>{p.name}</span>
                    <span className="text-muted-foreground text-xs">({p.slug})</span>
                  </label>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
