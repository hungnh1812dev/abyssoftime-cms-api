"use client";

import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";

import { useTheme } from "@/components/providers/ThemeProvider";

export function ThemeToggle() {
  const { theme, toggle } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  return (
    <button
      onClick={toggle}
      aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
      className="fixed bottom-4 right-4 z-50 flex h-9 w-9 items-center justify-center rounded-full border bg-background shadow-md transition-colors hover:bg-accent dark:border-border/60 dark:shadow-black/30 print:hidden">
      {mounted ? theme === "dark" ? <Sun className="h-4 w-4 text-yellow-400" /> : <Moon className="h-4 w-4 text-foreground/70" /> : <span className="h-4 w-4" />}
    </button>
  );
}
