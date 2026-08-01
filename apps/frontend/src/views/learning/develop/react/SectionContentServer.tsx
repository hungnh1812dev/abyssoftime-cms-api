import {
  Atom,
  Binary,
  Boxes,
  Braces,
  Database,
  FileCode,
  Gauge,
  GitBranch,
  Globe,
  Layers,
  type LucideIcon,
  Palette,
  ShieldCheck,
  Sparkles,
  TestTube2,
  Triangle,
  Workflow,
  Wrench,
  Zap,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { getReactKnowledgeSection } from "@/views/learning/develop/react/react-knowledge.service";
import type { KnowledgeSection } from "@/views/learning/develop/react/react-knowledge.types";
import { DEFAULT_SECTION_STYLE } from "@/views/learning/develop/react/react-knowledge.types";

import { SectionItemCard } from "./components/SectionItemCard";

const ICON_MAP: Record<string, LucideIcon> = {
  FileCode,
  Braces,
  Globe,
  Atom,
  Zap,
  Triangle,
  Sparkles,
  Gauge,
  ShieldCheck,
  Boxes,
  GitBranch,
  TestTube2,
  Layers,
  Database,
  Palette,
  Workflow,
  Binary,
  Wrench,
};

interface SectionContentServerProps {
  sectionId: string;
  searchQuery?: string;
}

export async function SectionContentServer({ sectionId, searchQuery }: SectionContentServerProps) {
  const section = (await getReactKnowledgeSection(sectionId)) as KnowledgeSection;

  const q = searchQuery?.trim().toLowerCase();
  const displayItems = q
    ? section.items.filter((item) => `${item.title} ${item.summary} ${item.body} ${item.whenToUse ?? ""} ${(item.tags ?? []).join(" ")}`.toLowerCase().includes(q))
    : section.items;

  const Icon = ICON_MAP[section.icon] ?? FileCode;
  const style = section.style ?? DEFAULT_SECTION_STYLE;

  return (
    <div className="px-4 py-6 md:px-8">
      <div className={cn("mb-6 rounded-xl border p-4", style.headerBg, style.headerBorder)}>
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg border bg-background/80 dark:border-border/60 dark:bg-background/60">
            <Icon className={cn("h-5 w-5", style.iconColor)} />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-xl font-bold text-foreground">{section.title}</h2>
            <p className="text-sm text-muted-foreground">{section.description}</p>
          </div>
          <span className="shrink-0 rounded-full bg-background/60 px-3 py-1 text-xs font-medium text-muted-foreground dark:bg-background/40">{displayItems.length} items</span>
        </div>
      </div>

      {q && (
        <p className="mb-3 text-xs text-muted-foreground">
          {displayItems.length} result{displayItems.length !== 1 ? "s" : ""} for &quot;{searchQuery}&quot;
        </p>
      )}

      {displayItems.length === 0 ? (
        <div className="py-20 text-center">
          <p className="text-lg text-muted-foreground">No results found</p>
          <p className="mt-1 text-sm text-muted-foreground/70">Try another keyword</p>
        </div>
      ) : (
        <div className="space-y-2">
          {displayItems.map((item) => (
            <SectionItemCard key={item.id} item={item} accentBorder={style.accentBorder} />
          ))}
        </div>
      )}
    </div>
  );
}
