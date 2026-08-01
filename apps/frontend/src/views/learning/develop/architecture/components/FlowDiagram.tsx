"use client";

import type { FlowStep } from "../data/types";
import { ArrowRight } from "lucide-react";

interface FlowDiagramProps {
  steps: FlowStep[];
}

export function FlowDiagram({ steps }: FlowDiagramProps) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {steps.map((step, i) => (
        <div key={i} className="flex items-center gap-1.5">
          {i > 0 && <ArrowRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />}
          <span className="rounded-md bg-muted px-2.5 py-1 text-xs font-semibold text-foreground">{step.label}</span>
        </div>
      ))}
    </div>
  );
}
