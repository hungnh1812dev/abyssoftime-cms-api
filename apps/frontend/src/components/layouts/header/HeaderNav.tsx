"use client";

import Link from "next/link";
import React from "react";

import { NAV_ITEMS } from "@/components/layouts/header/header.data";
import { cn } from "@/lib/utils";

interface HeaderNavProps {
  locale: string;
  currentPath: string;
}

const isActive = (currentPath: string, href: string): boolean => {
  if (href === "/") {
    return currentPath === "" || currentPath === "/";
  }
  return currentPath === href;
};

const HeaderNav: React.FC<HeaderNavProps> = ({ locale, currentPath }) => {
  return (
    <nav className="hidden items-center gap-1 md:flex">
      {NAV_ITEMS.map((item) => (
        <Link
          key={item.href}
          href={item.href === "/" ? `/${locale}` : `/${locale}${item.href}`}
          className={cn(
            "rounded-md px-3 py-2 text-sm transition-colors",
            isActive(currentPath, item.href) ? "font-medium text-foreground" : "text-muted-foreground hover:text-foreground",
          )}>
          {item.label}
        </Link>
      ))}
    </nav>
  );
};

export { HeaderNav };
