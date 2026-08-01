"use client";

import type { InfoBox as InfoBoxType } from "../data/types";

import { cn } from "@/lib/utils";

import { MarkdownText } from "./MarkdownText";

interface InfoBoxProps {
  box: InfoBoxType;
}

const STYLES: Record<InfoBoxType["type"], { border: string; bg: string; title: string }> = {
  tip: {
    border: "border-teal-500",
    bg: "bg-teal-500/10 dark:bg-teal-500/[0.07]",
    title: "text-teal-600 dark:text-teal-400",
  },
  warning: {
    border: "border-yellow-500",
    bg: "bg-yellow-500/10 dark:bg-yellow-500/[0.07]",
    title: "text-yellow-600 dark:text-yellow-400",
  },
  note: {
    border: "border-purple-500",
    bg: "bg-purple-500/10 dark:bg-purple-500/[0.07]",
    title: "text-purple-600 dark:text-purple-400",
  },
};

export function InfoBox({ box }: InfoBoxProps) {
  const style = STYLES[box.type];
  return (
    <div className={cn("rounded-md border-l-[3px] p-3", style.border, style.bg)}>
      <strong className={cn("mb-1 block text-[0.7rem] uppercase tracking-wide", style.title)}>{box.title}</strong>
      <div className="text-[0.8rem] text-foreground/85">
        <MarkdownText text={box.content} />
      </div>
    </div>
  );
}
