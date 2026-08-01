"use client";

import { useParams, usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { SESSION_STORAGE_KEY } from "@/libs/session";

// Paths (without locale prefix) that require authentication — must match homepage PAGES hrefs
const PROTECTED_PATHS = [
  "/cv",
  "/cv-2",
  "/vaccine",
  "/learning/english",
  "/learning/develop/react",
  "/learning/develop/architecture",
  "/learning/develop/go",
  "/interview",
  "/interview/answers",
];

interface SessionGuardProps {
  children: React.ReactNode;
}

export function SessionGuard({ children }: SessionGuardProps) {
  const [authorized, setAuthorized] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const params = useParams();
  const locale = (params?.locale as string) ?? "en";

  useEffect(() => {
    const pathWithoutLocale = pathname.startsWith(`/${locale}`) ? pathname.slice(`/${locale}`.length) : pathname;

    // Auth page itself — always allow
    if (pathWithoutLocale === "/auth" || pathWithoutLocale.startsWith("/auth/")) {
      setAuthorized(true);
      return;
    }

    // Home page: empty string when URL is /en, "/" when rewritten from /
    const isHome = pathWithoutLocale === "" || pathWithoutLocale === "/";
    const isProtected = isHome || PROTECTED_PATHS.includes(pathWithoutLocale);

    if (!isProtected) {
      setAuthorized(true);
      return;
    }

    const token = sessionStorage.getItem(SESSION_STORAGE_KEY);
    if (token) {
      setAuthorized(true);
    } else {
      router.replace(`/${locale}/auth?returnTo=${pathname}`);
    }
  }, [pathname, locale, router]);

  if (!authorized) return null;
  return <>{children}</>;
}
