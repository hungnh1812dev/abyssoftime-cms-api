"use client";

import { ChevronDown } from "lucide-react";

import { cn } from "@/lib/utils";
import type { SectionItem } from "@/views/learning/develop/go/go-knowledge.types";

import { CodeBlock } from "./CodeBlock";
import { renderBody } from "./markdown";

interface SectionItemCardProps {
  item: SectionItem;
  accentBorder?: string;
}

export function SectionItemCard({ item, accentBorder = "border-primary/30" }: SectionItemCardProps) {
  return (
    <details className="group rounded-lg border bg-card text-card-foreground transition-shadow hover:shadow-sm dark:border-border/60">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3.5 [&::-webkit-details-marker]:hidden">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-semibold text-foreground">{item.title}</span>
            {item.tags?.map((tag) => (
              <span key={tag} className="rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
                {tag}
              </span>
            ))}
          </div>
          <p className="mt-0.5 text-sm text-muted-foreground">{item.summary}</p>
        </div>
        <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200 group-open:rotate-180" />
      </summary>

      <div className="border-t px-4 pb-4 pt-3 dark:border-border/60">
        <div className="space-y-0.5">{renderBody(item.body)}</div>

        {item.codeExample && <CodeBlock example={item.codeExample} />}

        {item.subtopics && item.subtopics.length > 0 && (
          <div className="mt-4 space-y-3">
            {item.subtopics.map((sub) => (
              <div key={sub.title} className={cn("rounded-r-md border-l-2 py-1 pl-3", accentBorder)}>
                <p className="text-sm font-semibold text-foreground">{sub.title}</p>
                {sub.body && <div className="mt-1 space-y-0.5">{renderBody(sub.body)}</div>}
                {sub.codeExample && <CodeBlock example={sub.codeExample} />}
              </div>
            ))}
          </div>
        )}
      </div>
    </details>
  );
}
