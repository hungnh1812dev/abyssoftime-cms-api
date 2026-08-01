"use client";

import type { Badge, BadgeColor } from "../data/types";

import { cn } from "@/lib/utils";

interface BadgeListProps {
  badges: Badge[];
}

const COLOR_MAP: Record<BadgeColor, string> = {
  green: "bg-green-500/15 text-green-600 dark:text-green-400",
  blue: "bg-blue-500/15 text-blue-600 dark:text-blue-400",
  purple: "bg-purple-500/15 text-purple-600 dark:text-purple-400",
  orange: "bg-orange-500/15 text-orange-600 dark:text-orange-400",
  teal: "bg-teal-500/15 text-teal-600 dark:text-teal-400",
  red: "bg-red-500/15 text-red-500 dark:text-red-400",
  yellow: "bg-yellow-500/15 text-yellow-600 dark:text-yellow-400",
};

export function BadgeList({ badges }: BadgeListProps) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {badges.map((badge, i) => (
        <span key={i} className={cn("inline-block rounded-full px-2.5 py-0.5 text-[0.7rem] font-semibold", COLOR_MAP[badge.color])}>
          {badge.label}
        </span>
      ))}
    </div>
  );
}
