import type { InterviewQuestion } from "../data/types";

import { cn } from "@/lib/utils";

interface QuestionCardProps {
  question: InterviewQuestion;
  sectionColor: string;
}

export function QuestionCard({ question, sectionColor }: QuestionCardProps) {
  return (
    <div className="rounded-lg border bg-card px-4 py-3 transition-shadow hover:shadow-sm dark:border-border/60">
      <div className="flex items-start gap-3">
        <span className={cn("mt-0.5 shrink-0 rounded bg-muted px-1.5 py-0.5 font-mono text-[11px] font-semibold", sectionColor)}>{question.id}</span>
        <p className="text-sm leading-relaxed text-foreground/80">{question.question}</p>
      </div>
      {question.tags && question.tags.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1 pl-10">
          {question.tags.map((tag) => (
            <span key={tag} className="rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">
              {tag}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
