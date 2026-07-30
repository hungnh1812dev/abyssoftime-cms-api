import { cn } from "@/lib/utils";

import { Sidebar } from "./Sidebar";
import { useSidebar } from "./SidebarContext";

export function SidebarShell() {
  const { isMobile, mobileOpen, setMobileOpen } = useSidebar();

  if (isMobile) {
    return (
      <>
        {mobileOpen && <div data-testid="sidebar-backdrop" className="fixed inset-0 z-40 bg-black/50" onClick={() => setMobileOpen(false)} />}
        <div className={cn("fixed inset-y-0 left-0 z-40", mobileOpen ? "block" : "hidden")}>
          <Sidebar />
        </div>
      </>
    );
  }

  return <Sidebar />;
}
