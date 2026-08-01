"use client";

import { Fragment } from "react";

interface MarkdownTextProps {
  text: string;
}

export function MarkdownText({ text }: MarkdownTextProps) {
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);

  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith("**") && part.endsWith("**")) {
          return (
            <strong key={i} className="font-semibold text-foreground">
              {part.slice(2, -2)}
            </strong>
          );
        }
        if (part.startsWith("`") && part.endsWith("`")) {
          return (
            <code key={i} className="rounded bg-muted px-1 py-0.5 font-mono text-[0.75rem] text-foreground">
              {part.slice(1, -1)}
            </code>
          );
        }
        return <Fragment key={i}>{part}</Fragment>;
      })}
    </>
  );
}
