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

import { cn } from "@/lib/utils";
import type { KnowledgeSectionMeta } from "@/views/learning/develop/react/react-knowledge.types";
import { DEFAULT_SECTION_STYLE } from "@/views/learning/develop/react/react-knowledge.types";

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

interface SectionSidebarProps {
  sections: KnowledgeSectionMeta[];
  activeSectionId: string;
}

export function SectionSidebar({ sections, activeSectionId }: SectionSidebarProps) {
  return (
    <nav className="p-3">
      <p className="mb-2 px-2 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Sections</p>
      <ul className="space-y-0.5">
        {sections.map((section) => {
          const Icon = ICON_MAP[section.icon] ?? FileCode;
          const isActive = activeSectionId === section.id;
          const style = section.style ?? DEFAULT_SECTION_STYLE;

          return (
            <li key={section.id}>
              <Link
                href={`?section=${section.id}`}
                scroll={false}
                prefetch={true}
                className={cn(
                  "flex w-full items-center gap-2.5 rounded-md px-2 py-2 text-sm transition-colors",
                  isActive ? `${style.sidebarBg} font-semibold ${style.sidebarText}` : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}>
                <Icon className={cn("h-4 w-4 shrink-0", isActive ? style.iconColor : "")} />
                <span className="flex-1 truncate">{section.title}</span>
                <span className={cn("shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-medium tabular-nums", isActive ? "bg-background/50" : "bg-muted text-muted-foreground")}>
                  {section.itemCount}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
