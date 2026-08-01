"use client";

import type { ArchCodeBlock as ArchCodeBlockType } from "../data/types";

interface ArchCodeBlockProps {
  block: ArchCodeBlockType;
}

export function ArchCodeBlock({ block }: ArchCodeBlockProps) {
  const langLabel = block.language === "typescript" ? "TypeScript" : "JavaScript";
  const langColor = block.language === "typescript" ? "bg-blue-500/20 text-blue-400" : "bg-yellow-500/20 text-yellow-400";

  return (
    <div className="overflow-hidden rounded-lg">
      {block.caption && <p className="mb-1 text-xs text-muted-foreground">{block.caption}</p>}
      <div className="bg-slate-900 dark:bg-slate-950">
        <div className="flex items-center justify-between border-b border-slate-700/50 px-3 py-1.5">
          <span className={`rounded px-1.5 py-0.5 text-[0.65rem] font-medium ${langColor}`}>{langLabel}</span>
        </div>
        <pre className="overflow-x-auto p-3 text-[0.72rem] leading-relaxed text-slate-200">
          <code>{block.code}</code>
        </pre>
      </div>
    </div>
  );
}
