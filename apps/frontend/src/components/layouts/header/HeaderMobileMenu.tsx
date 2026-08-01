"use client";

import { Menu } from "lucide-react";
import Link from "next/link";
import React, { useState } from "react";

import { NAV_ITEMS } from "@/components/layouts/header/header.data";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

interface HeaderMobileMenuProps {
  locale: string;
  currentPath: string;
}

const isActive = (currentPath: string, href: string): boolean => {
  if (href === "/") {
    return currentPath === "" || currentPath === "/";
  }
  return currentPath === href;
};

const HeaderMobileMenu: React.FC<HeaderMobileMenuProps> = ({ locale, currentPath }) => {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setOpen(true)} aria-label="Open menu">
        <Menu className="h-5 w-5" />
      </Button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="left">
          <SheetHeader>
            <SheetTitle>Navigation</SheetTitle>
          </SheetHeader>
          <nav className="mt-6 flex flex-col gap-1">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href === "/" ? `/${locale}` : `/${locale}${item.href}`}
                  onClick={() => setOpen(false)}
                  className={cn(
                    "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm transition-colors",
                    isActive(currentPath, item.href) ? "bg-accent font-medium text-accent-foreground" : "text-muted-foreground hover:bg-accent/50 hover:text-foreground",
                  )}>
                  <Icon className="h-4 w-4" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </SheetContent>
      </Sheet>
    </>
  );
};

export { HeaderMobileMenu };
