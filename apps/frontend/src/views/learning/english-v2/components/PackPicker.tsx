"use client";

import { BookOpen, ChevronDown } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { cn } from "@/lib/utils";

import { GROUP_SIZE } from "./GroupPicker";

interface PackPickerProps {
  totalWords: number;
  packs: string[];
  activePack: number; // 0-based index into pages[]
  activeGroup: number;
  learnedCount: number;
  totalCount: number;
  onPackSelect: (index: number) => void;
}

export function PackPicker({ packs, totalWords, activePack, activeGroup, learnedCount, totalCount, onPackSelect }: PackPickerProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const start = activeGroup * GROUP_SIZE;
  const packIdx = activeGroup * GROUP_SIZE + activePack + 1; // 1-based index for API
  const totalPacks = Math.ceil(totalWords / GROUP_SIZE);
  const description = packs[activePack];
  const triggerLabel = description ? `Pack ${packIdx} — ${description}` : `Pack ${packIdx}`;

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={containerRef} className="relative flex min-w-0 items-center gap-2">
      <button
        onClick={() => setOpen((v) => !v)}
        title={triggerLabel}
        className={cn(
          "flex min-w-0 items-center gap-2 rounded-lg border px-3 py-1.5 text-sm transition-all",
          open
            ? "border-blue-500/50 bg-blue-50 text-blue-600 dark:bg-blue-500/15 dark:text-blue-300"
            : "border-slate-200 bg-white text-slate-600 hover:border-blue-500/30 hover:bg-blue-50 hover:text-slate-800 dark:border-white/15 dark:bg-white/5 dark:text-slate-400 dark:hover:bg-blue-500/10 dark:hover:text-slate-200",
        )}>
        <BookOpen className="h-3.5 w-3.5 flex-shrink-0" />
        <span className="flex-shrink-0 font-medium">{activePack !== undefined ? `Pack ${packIdx}` : "Chọn trang"}</span>
        {description && <span className="hidden min-w-0 max-w-[220px] truncate text-slate-400 dark:text-slate-500 sm:inline">— {description}</span>}
        <span className="ml-1 hidden flex-shrink-0 text-[11px] text-slate-400 dark:text-slate-500 sm:inline">
          {packIdx}/{totalPacks}
        </span>
        <ChevronDown className={cn("h-3.5 w-3.5 flex-shrink-0 transition-transform", open && "rotate-180")} />
      </button>

      <span className="whitespace-nowrap text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
        {learnedCount}/{totalCount} learned
      </span>

      {open && (
        <div className="fixed inset-x-3 top-[9.5rem] z-50 max-h-[calc(100vh-10rem)] overflow-y-auto overflow-x-hidden rounded-xl border border-slate-200 bg-white shadow-[0_16px_40px_rgba(0,0,0,0.1)] dark:border-white/10 dark:bg-slate-950 dark:shadow-[0_16px_40px_rgba(0,0,0,0.6)] sm:absolute sm:inset-x-auto sm:left-0 sm:top-full sm:mt-1.5 sm:max-h-none sm:w-72">
          {packs.map((_, i) => {
            const realIndex = start + i;
            const isActive = i === activePack;
            return (
              <button
                key={realIndex}
                onClick={() => {
                  onPackSelect(i);
                  setOpen(false);
                }}
                className={cn(
                  "flex w-full items-center gap-3 px-4 py-3 text-left transition-colors",
                  i < packs.length - 1 && "border-b border-slate-100 dark:border-white/5",
                  isActive
                    ? "bg-blue-50 text-blue-600 dark:bg-blue-500/15 dark:text-blue-300"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-white/5 dark:hover:text-slate-200",
                )}>
                <span
                  className={cn(
                    "flex h-6 w-8 flex-shrink-0 items-center justify-center rounded text-xs font-bold tabular-nums",
                    isActive ? "bg-blue-100 text-blue-600 dark:bg-blue-500/25 dark:text-blue-300" : "bg-slate-100 text-slate-500 dark:bg-white/10 dark:text-slate-500",
                  )}>
                  {realIndex + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold leading-tight">{`Pack ${realIndex + 1}`}</p>
                  <p className="text-xs leading-tight text-slate-400 dark:text-slate-500">{packs[i]}</p>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
