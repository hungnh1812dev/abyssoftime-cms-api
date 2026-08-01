"use client";

import type { ArchitectureCard } from "../data/types";
import {
  AppWindow,
  Blocks,
  Building,
  Building2,
  ClipboardList,
  Cloud,
  Compass,
  Dna,
  Drama,
  Eye,
  Factory,
  Hash,
  Hexagon,
  Landmark,
  Layers,
  Link,
  type LucideIcon,
  Microscope,
  Plug,
  RefreshCw,
  Repeat,
  Ribbon,
  Ruler,
  Scale,
  Scroll,
  ShieldCheck,
  Swords,
  Target,
  TreePine,
  Zap,
} from "lucide-react";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { cn } from "@/lib/utils";

import { CardTabs } from "./CardTabs";
import { ContentRenderer } from "./ContentRenderer";

const ICON_MAP: Record<string, LucideIcon> = {
  Building2,
  Microscope,
  Zap,
  Cloud,
  Layers,
  Target,
  Hexagon,
  Scale,
  Scroll,
  Hash,
  Factory,
  Building,
  Blocks,
  Dna,
  Plug,
  Ribbon,
  AppWindow,
  ShieldCheck,
  TreePine,
  Landmark,
  Eye,
  Swords,
  ClipboardList,
  Link,
  RefreshCw,
  Ruler,
  Drama,
  Repeat,
  Compass,
};

interface PatternCardProps {
  card: ArchitectureCard;
}

export function PatternCard({ card }: PatternCardProps) {
  const Icon = ICON_MAP[card.icon] ?? Layers;

  return (
    <Card className={cn("overflow-hidden border-border/60", card.isWide && "md:col-span-2")}>
      <CardHeader className="flex flex-row items-start gap-3 space-y-0 pb-3">
        <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-lg", card.iconColor.replace("text-", "bg-").replace(/(\d+)/, "$1/20"))}>
          <Icon className={cn("h-5 w-5", card.iconColor)} />
        </div>
        <div className="min-w-0">
          <h3 className="text-sm font-bold text-foreground">{card.title}</h3>
          <p className="mt-0.5 text-[0.78rem] text-muted-foreground">{card.subtitle}</p>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {card.tabs && card.tabs.length > 0 ? <CardTabs tabs={card.tabs} /> : card.content ? <ContentRenderer content={card.content} /> : null}
      </CardContent>
    </Card>
  );
}
