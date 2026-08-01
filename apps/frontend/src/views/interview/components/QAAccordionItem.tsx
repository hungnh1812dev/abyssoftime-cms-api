import type { InterviewQuestion } from "../data/types";

import { cn } from "@/lib/utils";

import { AnswerRenderer } from "./AnswerRenderer";

interface QAAccordionItemProps {
  question: InterviewQuestion;
  sectionColor: string;
  sectionBgColor: string;
  detailsRef: (el: HTMLDetailsElement | null) => void;
}

export function QAAccordionItem({ question, sectionColor, sectionBgColor, detailsRef }: QAAccordionItemProps) {
  return (
    <details ref={detailsRef} className="group rounded-lg border bg-card transition-shadow hover:shadow-sm dark:border-border/60">
      <summary className="flex cursor-pointer list-none items-start gap-3 px-4 py-3 [&::-webkit-details-marker]:hidden">
        <span className={cn("mt-0.5 shrink-0 rounded bg-muted px-1.5 py-0.5 font-mono text-[11px] font-semibold", sectionColor)}>{question.id}</span>
        <p className="flex-1 text-sm leading-relaxed text-foreground/80">{question.question}</p>
        <svg
          className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="m19 9-7 7-7-7" />
        </svg>
      </summary>

      <div className={cn("mx-3 mb-3 rounded-md p-3", sectionBgColor)}>
        {question.tags && question.tags.length > 0 && (
          <div className="mb-2 flex flex-wrap gap-1">
            {question.tags.map((tag) => (
              <span key={tag} className="rounded-full bg-background/60 px-2 py-0.5 text-[10px] text-muted-foreground dark:bg-background/40">
                {tag}
              </span>
            ))}
          </div>
        )}
        <AnswerRenderer text={question.answer} />
      </div>
    </details>
  );
}
