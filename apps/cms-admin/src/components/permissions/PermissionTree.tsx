import { buildDocumentPermissionSlug, groupByResource, parseDocumentPermissionSlug } from "@/components/permissions/permissionGrouping";
import { useContentTypes } from "@/hooks/useContentTypes";
import type { PermissionItem } from "@/hooks/usePermissions";
import { useEffect, useState } from "react";

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

type DocumentScopeMode = "all" | "specific";

function isScopedForAction(slug: string, action: string): boolean {
  const parsed = parseDocumentPermissionSlug(slug);
  return parsed?.action === action && Boolean(parsed.contentTypeSlug);
}

function DocumentPermissionGroup({ perms, selected, onChange }: { perms: PermissionItem[]; selected: string[]; onChange: (next: string[]) => void }) {
  const { data: contentTypes } = useContentTypes();

  const actions: { action: string; name: string }[] = [];
  const seenActions = new Set<string>();
  for (const p of perms) {
    const parsed = parseDocumentPermissionSlug(p.slug);
    if (!parsed || parsed.contentTypeSlug || seenActions.has(parsed.action)) continue;
    seenActions.add(parsed.action);
    actions.push({ action: parsed.action, name: p.name });
  }

  const [modes, setModes] = useState<Record<string, DocumentScopeMode>>(() => {
    const initial: Record<string, DocumentScopeMode> = {};
    for (const { action } of actions) {
      initial[action] = selected.some((s) => isScopedForAction(s, action)) ? "specific" : "all";
    }
    return initial;
  });

  // Re-derives mode whenever `selected` changes for reasons outside this component's own
  // handlers (e.g. the parent's "Select All", or an async-loaded initial selection arriving
  // after mount) — otherwise a scoped grant can end up hidden behind a stale "all" mode. This is
  // the React-supported "adjust state during render" pattern (not a useEffect): it runs as part
  // of this render rather than as a separate commit, so there's no flash of stale mode.
  // https://react.dev/learn/you-might-not-need-an-effect#adjusting-some-state-when-a-prop-changes
  const [prevSelected, setPrevSelected] = useState(selected);
  if (selected !== prevSelected) {
    setPrevSelected(selected);
    const nextModes = { ...modes };
    for (const { action } of actions) {
      const hasScoped = selected.some((s) => isScopedForAction(s, action));
      if (hasScoped) nextModes[action] = "specific";
      else if (selected.includes(buildDocumentPermissionSlug(action))) nextModes[action] = "all";
    }
    setModes(nextModes);
  }

  // A scoped grant and the global grant for the same action shouldn't coexist invisibly: once
  // scoped mode is showing (and thus hiding the global checkbox), drop the now-redundant global
  // slug so the visible checkboxes always match what's actually granted. This notifies the
  // parent's selection, so it belongs in an effect rather than during render.
  useEffect(() => {
    const globalSlugsToStrip = actions
      .filter(({ action }) => selected.some((s) => isScopedForAction(s, action)) && selected.includes(buildDocumentPermissionSlug(action)))
      .map(({ action }) => buildDocumentPermissionSlug(action));
    if (globalSlugsToStrip.length > 0) {
      onChange(selected.filter((s) => !globalSlugsToStrip.includes(s)));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected, actions]);

  function setMode(action: string, mode: DocumentScopeMode) {
    setModes((prev) => ({ ...prev, [action]: mode }));
    if (mode === "all") {
      onChange(selected.filter((s) => !isScopedForAction(s, action)));
    } else {
      const globalSlug = buildDocumentPermissionSlug(action);
      onChange(selected.filter((s) => s !== globalSlug));
    }
  }

  function toggleGlobal(action: string) {
    const slug = buildDocumentPermissionSlug(action);
    onChange(selected.includes(slug) ? selected.filter((s) => s !== slug) : [...selected, slug]);
  }

  function toggleScoped(action: string, contentTypeSlug: string) {
    const slug = buildDocumentPermissionSlug(action, contentTypeSlug);
    onChange(selected.includes(slug) ? selected.filter((s) => s !== slug) : [...selected, slug]);
  }

  return (
    <div className="rounded-md border p-3">
      <span className="text-sm font-medium">document</span>
      <div className="mt-2 ml-5 space-y-3 border-l pl-3">
        {actions.map(({ action, name }) => {
          const mode = modes[action] ?? "all";
          const globalSlug = buildDocumentPermissionSlug(action);
          return (
            <div key={action} data-testid={`document-permission-${action}`} className="space-y-1">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-sm font-medium capitalize">{action}</span>
                <div className="flex gap-3 text-xs">
                  <label className="flex cursor-pointer items-center gap-1">
                    <input type="radio" name={`document-scope-${action}`} checked={mode === "all"} onChange={() => setMode(action, "all")} />
                    All content types
                  </label>
                  <label className="flex cursor-pointer items-center gap-1">
                    <input type="radio" name={`document-scope-${action}`} checked={mode === "specific"} onChange={() => setMode(action, "specific")} />
                    Specific content types
                  </label>
                </div>
              </div>
              {mode === "all" ? (
                <label className="flex cursor-pointer items-center gap-2 text-sm">
                  <input type="checkbox" checked={selected.includes(globalSlug)} onChange={() => toggleGlobal(action)} className="rounded" />
                  <span>{name}</span>
                </label>
              ) : (
                <div className="space-y-1 pl-2">
                  {(contentTypes ?? []).map((ct) => {
                    const slug = buildDocumentPermissionSlug(action, ct.slug);
                    return (
                      <label key={ct.slug} className="flex cursor-pointer items-center gap-2 text-sm">
                        <input type="checkbox" checked={selected.includes(slug)} onChange={() => toggleScoped(action, ct.slug)} className="rounded" />
                        <span>{ct.name}</span>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
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
          if (resource === "document") {
            return <DocumentPermissionGroup key={resource} perms={perms} selected={selected} onChange={onChange} />;
          }

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
