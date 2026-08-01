"use client";

import Link from "next/link";
import { useParams, usePathname } from "next/navigation";
import React from "react";

import { HeaderMobileMenu } from "@/components/layouts/header/HeaderMobileMenu";
import { HeaderNav } from "@/components/layouts/header/HeaderNav";

const HeaderBar: React.FC = () => {
  const pathname = usePathname();
  const params = useParams();
  const locale = (params?.locale as string) ?? "en";
  const currentPath = pathname.startsWith(`/${locale}`) ? pathname.slice(`/${locale}`.length) : pathname;

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 print:hidden">
      <div className="mx-auto flex h-14 max-w-screen-2xl items-center px-4 md:px-6">
        <Link href={`/${locale}`} className="mr-4 flex items-center gap-2 font-semibold">
          Abyssoftime
        </Link>
        <HeaderNav locale={locale} currentPath={currentPath} />
        <div className="flex flex-1 items-center justify-end md:flex-none">
          <HeaderMobileMenu locale={locale} currentPath={currentPath} />
        </div>
      </div>
    </header>
  );
};

export { HeaderBar };
