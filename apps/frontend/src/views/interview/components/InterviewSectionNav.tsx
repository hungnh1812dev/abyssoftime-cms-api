"use client";

import type { InterviewSection } from "../data/types";

import { cn } from "@/lib/utils";

interface InterviewSectionNavProps {
  sections: InterviewSection[];
  activeSectionId: string;
  onSelect: (id: string) => void;
  /** When true, renders as mobile horizontal chip strip instead of vertical sidebar */
  mobile?: boolean;
}

export function InterviewSectionNav({ sections, activeSectionId, onSelect, mobile = false }: InterviewSectionNavProps) {
  if (mobile) {
    return (
      <div className="scrollbar-none flex gap-1.5 overflow-x-auto pb-1">
        {sections.map((section) => {
          const isActive = section.id === activeSectionId;
          return (
            <button
              key={section.id}
              onClick={() => onSelect(section.id)}
              className={cn(
                "flex shrink-0 items-center gap-1 rounded-full border px-2.5 py-1 text-xs transition-colors",
                isActive ? `${section.bgColor} ${section.color} border-transparent font-medium` : "border-border/60 text-muted-foreground hover:bg-muted",
              )}>
              {section.label.split(".")[0].trim()}
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <nav className="p-3">
      <p className="mb-2 px-2 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Sections</p>
      <ul className="space-y-0.5">
        {sections.map((section) => {
          const isActive = section.id === activeSectionId;
          return (
            <li key={section.id}>
              <button
                onClick={() => onSelect(section.id)}
                className={cn(
                  "flex w-full items-center gap-2.5 rounded-md px-2 py-2 text-left text-sm transition-colors",
                  isActive ? `${section.bgColor} font-semibold ${section.color}` : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}>
                <span className="flex-1 truncate">{section.label}</span>
                <span className={cn("shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-medium tabular-nums", isActive ? "bg-background/50" : "bg-muted text-muted-foreground")}>
                  {section.questions.length}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
