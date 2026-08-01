"use client";

import { ChevronDown, Layers } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { cn } from "@/lib/utils";

interface GroupPickerProps {
  totalWords: number;
  activeGroup: number;
  onGroupSelect: (groupIndex: number) => void;
}

export const GROUP_SIZE = 10;
export const GROUP_CHUNK_SIZE = 100;

export function GroupPicker({ totalWords, activeGroup, onGroupSelect }: GroupPickerProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const groupCount = Math.ceil(totalWords / GROUP_CHUNK_SIZE);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function groupLabel(g: number) {
    const start = g * GROUP_SIZE + 1;
    const end = Math.min((g + 1) * GROUP_SIZE, totalWords);
    return `Packs ${start}–${end}`;
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm transition-all",
          open
            ? "border-blue-500/50 bg-blue-50 text-blue-600 dark:bg-blue-500/15 dark:text-blue-300"
            : "border-slate-200 bg-white text-slate-600 hover:border-blue-500/30 hover:bg-blue-50 hover:text-slate-800 dark:border-white/15 dark:bg-white/5 dark:text-slate-400 dark:hover:bg-blue-500/10 dark:hover:text-slate-200",
        )}>
        <Layers className="h-3.5 w-3.5 flex-shrink-0" />
        <span className="font-medium">{groupLabel(activeGroup)}</span>
        <ChevronDown className={cn("h-3.5 w-3.5 flex-shrink-0 transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <div className="absolute left-0 top-full z-50 mt-1.5 max-h-64 w-36 overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-[0_16px_40px_rgba(0,0,0,0.1)] dark:border-white/10 dark:bg-slate-950 dark:shadow-[0_16px_40px_rgba(0,0,0,0.6)]">
          {Array.from({ length: groupCount }, (_, g) => (
            <button
              key={g}
              onClick={() => {
                onGroupSelect(g);
                setOpen(false);
              }}
              className={cn(
                "w-full px-3 py-2 text-left text-xs transition-colors",
                g === activeGroup
                  ? "bg-blue-50 font-semibold text-blue-600 dark:bg-blue-500/15 dark:text-blue-300"
                  : "text-slate-500 hover:bg-slate-50 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-white/5 dark:hover:text-slate-200",
              )}>
              {groupLabel(g)}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
