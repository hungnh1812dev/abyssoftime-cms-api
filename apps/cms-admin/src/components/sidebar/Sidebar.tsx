import { FileText, LogOut, Settings } from "lucide-react";

import { useAuth } from "@/hooks/useAuth";
import { useContentTypes } from "@/hooks/useContentTypes";
import { hasPermission } from "@/lib/permissions";
import { cn } from "@/lib/utils";

import { SidebarBrand } from "./SidebarBrand";
import { SidebarCollapseToggle } from "./SidebarCollapseToggle";
import { useSidebar } from "./SidebarContext";
import { SidebarGroup } from "./SidebarGroup";
import { SidebarItem } from "./SidebarItem";
import { SidebarSubGroup } from "./SidebarSubGroup";

export function Sidebar() {
  const { collapsed } = useSidebar();
  const { data: contentTypes } = useContentTypes();
  const { displayName, role, permissions, logout } = useAuth();

  const singleTypes = (contentTypes ?? []).filter((contentType) => contentType.kind === "single");
  const collectionTypes = (contentTypes ?? []).filter((contentType) => contentType.kind === "collection");

  // Permission-based gating (specs/access-token-auth-mismatch.md §13.6) —
  // fully replaces the former roleLevel-tier checks. Items are omitted from
  // the render tree entirely when the permission is absent, not just
  // disabled, so a role without a permission never sees the link at all.
  // `hasPermission` treats the matching `:manager` permission as satisfying
  // a `:read` requirement, mirroring the backend's PermissionsGuard.
  const can = (permission: string) => hasPermission(permissions, permission);

  return (
    <aside
      role="complementary"
      className={cn("bg-sidebar border-sidebar-border flex shrink-0 flex-col overflow-hidden border-r transition-[width] duration-200 ease-in-out", collapsed ? "w-16" : "w-64")}>
      <SidebarBrand />

      <nav className="flex-1 space-y-1 overflow-y-auto p-2">
        <SidebarGroup icon={FileText} label="Content Manager" storageKey="content-manager" defaultOpen>
          {singleTypes.length > 0 && (
            <SidebarSubGroup label="Single Types">
              {singleTypes.map((contentType) => (
                <SidebarItem key={contentType.slug} to={`/admin/content-type/single-type/${contentType.slug}`}>
                  {contentType.name}
                </SidebarItem>
              ))}
            </SidebarSubGroup>
          )}
          {collectionTypes.length > 0 && (
            <SidebarSubGroup label="Collection Types">
              {collectionTypes.map((contentType) => (
                <SidebarItem key={contentType.slug} to={`/admin/content-type/collection-type/${contentType.slug}`}>
                  {contentType.name}
                </SidebarItem>
              ))}
            </SidebarSubGroup>
          )}
        </SidebarGroup>

        <SidebarGroup icon={Settings} label="Settings" storageKey="settings" defaultOpen>
          {can("media:read") && <SidebarItem to="/admin/settings/media">Media Library</SidebarItem>}
          {can("user:read") && <SidebarItem to="/admin/settings/users">Users</SidebarItem>}
          {can("api_token:read") && <SidebarItem to="/admin/settings/access-tokens">Access Tokens</SidebarItem>}
          {can("role:read") && <SidebarItem to="/admin/settings/roles">Roles</SidebarItem>}
          {can("permission:read") && <SidebarItem to="/admin/settings/permissions">Permissions</SidebarItem>}
        </SidebarGroup>
      </nav>

      <div className="border-sidebar-border space-y-1 border-t p-2">
        {displayName && !collapsed && (
          <span className="text-sidebar-muted block truncate px-3 py-1 text-xs">
            {displayName}
            {role && ` (${role.name})`}
          </span>
        )}
        <button
          type="button"
          onClick={logout}
          className={cn(
            "text-sidebar-muted hover:bg-sidebar-accent hover:text-sidebar-accent-foreground flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors",
            collapsed && "justify-center px-0",
          )}>
          <LogOut className="size-4 shrink-0" />
          <span className={cn("truncate", collapsed && "sr-only")}>Logout</span>
        </button>
        <SidebarCollapseToggle />
      </div>
    </aside>
  );
}
