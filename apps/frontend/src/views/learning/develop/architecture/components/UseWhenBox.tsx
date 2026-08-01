"use client";

import type { ListBlock } from "../data/types";

import { cn } from "@/lib/utils";

import { MarkdownText } from "./MarkdownText";

interface UseWhenBoxProps {
  block: ListBlock;
  variant?: "positive" | "negative";
}

export function UseWhenBox({ block, variant = "positive" }: UseWhenBoxProps) {
  const isPositive = variant === "positive";

  return (
    <div
      className={cn(
        "rounded-md border-l-[3px] p-3",
        isPositive ? "border-green-500 bg-green-500/10 dark:bg-green-500/[0.07]" : "border-red-500 bg-red-500/10 dark:bg-red-500/[0.07]",
      )}>
      <h5 className={cn("mb-2 text-[0.7rem] font-bold uppercase tracking-wide", isPositive ? "text-green-600 dark:text-green-400" : "text-red-500 dark:text-red-400")}>
        {block.title}
      </h5>
      <ul className="space-y-1.5 pl-4 text-[0.8rem] text-foreground/85">
        {block.items.map((item, i) => (
          <li key={i} className="list-disc">
            <MarkdownText text={item} />
          </li>
        ))}
      </ul>
    </div>
  );
}
