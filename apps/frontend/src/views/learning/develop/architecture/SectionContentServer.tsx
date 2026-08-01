import { Activity, Compass, Layers, type LucideIcon, Package, Puzzle, Shield, Workflow } from "lucide-react";

import { cn } from "@/lib/utils";
import { DEFAULT_SECTION_STYLE } from "@/views/learning/develop/react/react-knowledge.types";

import { getArchitectureKnowledgeSection } from "./architecture-knowledge.service";
import { PatternCard } from "./components/PatternCard";
import type { ArchitectureCard, ArchitectureSection } from "./data/types";

const ICON_MAP: Record<string, LucideIcon> = {
  Layers,
  Workflow,
  Shield,
  Package,
  Puzzle,
  Activity,
  Compass,
};

interface SectionContentServerProps {
  sectionId: string;
  searchQuery?: string;
}

function cardMatchesQuery(card: ArchitectureCard, query: string): boolean {
  const searchable = [card.title, card.subtitle];

  if (card.tabs) {
    for (const tab of card.tabs) {
      searchable.push(tab.label);
      const c = tab.content;
      if (c.description) searchable.push(c.description);
      if (c.useWhen) searchable.push(...c.useWhen.items);
      if (c.dontUseWhen) searchable.push(...c.dontUseWhen.items);
    }
  }

  if (card.content) {
    const c = card.content;
    if (c.description) searchable.push(c.description);
    if (c.useWhen) searchable.push(...c.useWhen.items);
    if (c.dontUseWhen) searchable.push(...c.dontUseWhen.items);
  }

  return searchable.join(" ").toLowerCase().includes(query);
}

export async function SectionContentServer({ sectionId, searchQuery }: SectionContentServerProps) {
  const section = (await getArchitectureKnowledgeSection(sectionId)) as ArchitectureSection;

  const q = searchQuery?.trim().toLowerCase();
  const displayCards = q ? section.cards.filter((card) => cardMatchesQuery(card, q)) : section.cards;

  const Icon = ICON_MAP[section.icon] ?? Layers;
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
          <span className="shrink-0 rounded-full bg-background/60 px-3 py-1 text-xs font-medium text-muted-foreground dark:bg-background/40">{displayCards.length} cards</span>
        </div>
      </div>

      {q && (
        <p className="mb-3 text-xs text-muted-foreground">
          {displayCards.length} result{displayCards.length !== 1 ? "s" : ""} for &quot;{searchQuery}&quot;
        </p>
      )}

      {displayCards.length === 0 ? (
        <div className="py-20 text-center">
          <p className="text-lg text-muted-foreground">No results found</p>
          <p className="mt-1 text-sm text-muted-foreground/70">Try another keyword</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {displayCards.map((card) => (
            <PatternCard key={card.id} card={card} />
          ))}
        </div>
      )}
    </div>
  );
}
