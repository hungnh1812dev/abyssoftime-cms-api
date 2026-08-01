"use client";

import { ChevronDown } from "lucide-react";

import { cn } from "@/lib/utils";
import type { RenderPhase, SectionItem } from "@/views/learning/develop/react/react-knowledge.types";

import { CodeBlock } from "./CodeBlock";
import { renderBody } from "./markdown";
import { RunnableCodeBlock } from "./RunnableCodeBlock";

interface SectionItemCardProps {
  item: SectionItem;
  accentBorder?: string;
}

// ── Hook rendering ────────────────────────────────────────────────────────────

const PHASE_BADGE: Record<RenderPhase, string> = {
  render: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  commit: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  "post-commit": "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
  lazy: "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300",
};

const PHASE_SIG_BG: Record<RenderPhase, string> = {
  render: "bg-blue-50 dark:bg-blue-900/20 dark:border-blue-900/40",
  commit: "bg-amber-50 dark:bg-amber-900/20 dark:border-amber-900/40",
  "post-commit": "bg-green-50 dark:bg-green-900/20 dark:border-green-900/40",
  lazy: "bg-purple-50 dark:bg-purple-900/20 dark:border-purple-900/40",
};

const PHASE_TIMING_BOX: Record<RenderPhase, string> = {
  render: "bg-blue-50 border-blue-100 dark:bg-blue-900/20 dark:border-blue-900/50",
  commit: "bg-amber-50 border-amber-100 dark:bg-amber-900/20 dark:border-amber-900/50",
  "post-commit": "bg-green-50 border-green-100 dark:bg-green-900/20 dark:border-green-900/50",
  lazy: "bg-purple-50 border-purple-100 dark:bg-purple-900/20 dark:border-purple-900/50",
};

const PHASE_OPEN_BG: Record<RenderPhase, string> = {
  render: "open:bg-blue-50/30 dark:open:bg-blue-900/10",
  commit: "open:bg-amber-50/30 dark:open:bg-amber-900/10",
  "post-commit": "open:bg-green-50/30 dark:open:bg-green-900/10",
  lazy: "open:bg-purple-50/30 dark:open:bg-purple-900/10",
};

function HookItemCard({ item }: { item: SectionItem }) {
  const phase = item.renderPhase!.phase;

  return (
    <details className={cn("group rounded-lg border bg-card text-card-foreground transition-shadow hover:shadow-sm dark:border-border/60", PHASE_OPEN_BG[phase])}>
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3.5 [&::-webkit-details-marker]:hidden">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono font-bold text-primary">{item.title}</span>
            <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-medium", PHASE_BADGE[phase])}>{item.renderPhase!.label}</span>
          </div>
          <p className="mt-0.5 text-sm text-muted-foreground">{item.summary}</p>
        </div>
        <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200 group-open:rotate-180" />
      </summary>

      <div className="space-y-3 border-t px-4 pb-4 pt-3 dark:border-border/60">
        {item.hookSignature && (
          <pre className={cn("overflow-x-auto rounded-md border px-3 py-2 font-mono text-[11px] text-muted-foreground", PHASE_SIG_BG[phase])}>{item.hookSignature}</pre>
        )}

        <div className={cn("flex items-center gap-2 rounded-md border px-3 py-2", PHASE_TIMING_BOX[phase])}>
          <span className={cn("rounded-full px-1.5 py-0.5 text-[11px] font-semibold", PHASE_BADGE[phase])}>{item.renderPhase!.label}</span>
          <span className="text-xs text-muted-foreground">{item.renderPhase!.timing}</span>
        </div>

        <div className="space-y-0.5">{renderBody(item.body)}</div>

        {item.whenToUse && (
          <div className="rounded-md bg-muted/50 p-3 dark:bg-muted/30">
            <p className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">When to use</p>
            <p className="text-sm text-foreground/80">{item.whenToUse}</p>
          </div>
        )}

        {item.caveats && item.caveats.length > 0 && (
          <div className="rounded-md border border-amber-200 bg-amber-50 p-3 dark:border-amber-900/40 dark:bg-amber-900/10">
            <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-amber-700 dark:text-amber-400">Caveats</p>
            <ul className="space-y-1">
              {item.caveats.map((c, i) => (
                <li key={i} className="flex gap-2 text-sm text-foreground/70">
                  <span className="mt-[0.375rem] h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500/60" />
                  {c}
                </li>
              ))}
            </ul>
          </div>
        )}

        {item.codeExample && <CodeBlock example={item.codeExample} />}
      </div>
    </details>
  );
}

// ── Topic rendering ───────────────────────────────────────────────────────────

function TopicItemCard({ item, accentBorder = "border-primary/30" }: { item: SectionItem; accentBorder?: string }) {
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

        {item.codeExample && (item.codeExample.runnable ? <RunnableCodeBlock example={item.codeExample} /> : <CodeBlock example={item.codeExample} />)}

        {item.subtopics && item.subtopics.length > 0 && (
          <div className="mt-4 space-y-3">
            {item.subtopics.map((sub) => (
              <div key={sub.title} className={cn("rounded-r-md border-l-2 py-1 pl-3", accentBorder)}>
                <p className="text-sm font-semibold text-foreground">{sub.title}</p>
                {sub.body && <div className="mt-1 space-y-0.5">{renderBody(sub.body)}</div>}
                {sub.codeExample && (sub.codeExample.runnable ? <RunnableCodeBlock example={sub.codeExample} /> : <CodeBlock example={sub.codeExample} />)}
              </div>
            ))}
          </div>
        )}
      </div>
    </details>
  );
}

// ── Public dispatcher ─────────────────────────────────────────────────────────

export function SectionItemCard({ item, accentBorder }: SectionItemCardProps) {
  if (item.renderPhase != null) return <HookItemCard item={item} />;
  return <TopicItemCard item={item} accentBorder={accentBorder} />;
}
