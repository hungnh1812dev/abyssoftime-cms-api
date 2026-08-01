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
import Link from "next/link";
import { Suspense } from "react";

import { cn } from "@/lib/utils";
import type { KnowledgeSectionMeta } from "@/views/learning/develop/react/react-knowledge.types";
import { DEFAULT_SECTION_STYLE } from "@/views/learning/develop/react/react-knowledge.types";

import { SearchInput } from "./components/SearchInput";
import { SectionSidebar } from "./components/SectionSidebar";
import { SectionContentServer } from "./SectionContentServer";

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

interface ReactKnowledgePageProps {
  sections: KnowledgeSectionMeta[];
  activeSectionId: string;
  searchQuery?: string;
  totalTopics: number;
}

export default function ReactKnowledgePage({ sections, activeSectionId, searchQuery, totalTopics }: ReactKnowledgePageProps) {
  return (
    <div className="flex min-h-screen bg-background">
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-screen shrink-0 flex-col overflow-y-auto border-r bg-background dark:border-border/60 md:flex md:w-52 lg:w-60">
        <div className="border-b p-3 dark:border-border/60">
          <h2 className="text-sm font-semibold text-foreground">React Knowledge</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">{totalTopics} topics</p>
        </div>
        <SectionSidebar sections={sections} activeSectionId={activeSectionId} />
      </aside>

      {/* Main content */}
      <main className="min-w-0 flex-1">
        {/* Sticky header */}
        <div className="sticky top-0 z-10 border-b bg-background/95 px-4 py-3 backdrop-blur dark:border-border/60 dark:bg-background/90">
          {/* Mobile: horizontal section chips */}
          <div className="scrollbar-none mb-2 flex gap-1.5 overflow-x-auto pb-1 md:hidden">
            {sections.map((section) => {
              const Icon = ICON_MAP[section.icon] ?? FileCode;
              const isActive = activeSectionId === section.id;
              const style = section.style ?? DEFAULT_SECTION_STYLE;
              return (
                <Link
                  key={section.id}
                  href={`?section=${section.id}`}
                  scroll={false}
                  className={cn(
                    "flex shrink-0 items-center gap-1 rounded-full border px-2.5 py-1 text-xs transition-colors",
                    isActive ? `${style.sidebarBg} ${style.sidebarText} border-transparent` : "border-border/60 text-muted-foreground hover:bg-muted",
                  )}>
                  <Icon className={cn("h-3 w-3", isActive ? style.iconColor : "")} />
                  {section.title}
                </Link>
              );
            })}
          </div>

          {/* Search — client island, remounts on section change to clear input */}
          <SearchInput key={activeSectionId} defaultValue={searchQuery ?? ""} />

          {searchQuery && (
            <p className="mt-1.5 text-xs text-muted-foreground">
              Searching &quot;{searchQuery}&quot; in {sections.find((s) => s.id === activeSectionId)?.title ?? "section"}
            </p>
          )}
        </div>

        {/* Section content — suspense boundary resets only on section change */}
        <Suspense key={activeSectionId} fallback={<SectionContentSkeleton />}>
          <SectionContentServer sectionId={activeSectionId} searchQuery={searchQuery} />
        </Suspense>
      </main>
    </div>
  );
}

function SectionContentSkeleton() {
  return (
    <div className="px-4 py-6 md:px-8">
      <div className="mb-6 h-20 animate-pulse rounded-xl bg-muted" />
      <div className="space-y-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-14 animate-pulse rounded-lg bg-muted" />
        ))}
      </div>
    </div>
  );
}
