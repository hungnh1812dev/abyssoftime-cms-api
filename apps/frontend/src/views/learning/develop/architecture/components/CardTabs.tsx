"use client";

import type { CardTab } from "../data/types";
import { useState } from "react";

import { cn } from "@/lib/utils";

import { ContentRenderer } from "./ContentRenderer";

interface CardTabsProps {
  tabs: CardTab[];
}

export function CardTabs({ tabs }: CardTabsProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const activeTab = tabs[activeIndex];

  return (
    <div>
      <div className="scrollbar-none mb-3 flex gap-1 overflow-x-auto">
        {tabs.map((tab, i) => (
          <button
            key={i}
            onClick={() => setActiveIndex(i)}
            className={cn(
              "shrink-0 rounded-full border px-3 py-1 text-[0.72rem] font-semibold transition-colors",
              i === activeIndex ? "border-primary bg-primary text-primary-foreground" : "border-border bg-muted text-muted-foreground hover:bg-primary/10 hover:text-foreground",
            )}>
            {tab.label}
          </button>
        ))}
      </div>
      {activeTab && <ContentRenderer content={activeTab.content} />}
    </div>
  );
}
