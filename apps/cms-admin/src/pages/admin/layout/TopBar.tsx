import { Menu } from "lucide-react";

import { useSidebar } from "@/components/sidebar";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { useBreadcrumbs } from "@/hooks/useBreadcrumbs";

export function TopBar() {
  const crumbs = useBreadcrumbs();
  const { isMobile, setMobileOpen } = useSidebar();

  return (
    <header className="border-border flex h-14 shrink-0 items-center border-b px-6">
      <div className="flex items-center gap-3">
        {isMobile && (
          <Button variant="ghost" size="icon-sm" aria-label="Open menu" onClick={() => setMobileOpen(true)}>
            <Menu />
          </Button>
        )}
        <Breadcrumb items={crumbs} />
      </div>
    </header>
  );
}
