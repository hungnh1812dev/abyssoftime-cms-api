"use client";

import type { CardContent } from "../data/types";

import { ArchCodeBlock } from "./ArchCodeBlock";
import { BadgeList } from "./BadgeList";
import { DecisionTable } from "./DecisionTable";
import { FlowDiagram } from "./FlowDiagram";
import { InfoBox } from "./InfoBox";
import { MarkdownText } from "./MarkdownText";
import { ProsCons } from "./ProsCons";
import { UseWhenBox } from "./UseWhenBox";

interface ContentRendererProps {
  content: CardContent;
}

export function ContentRenderer({ content }: ContentRendererProps) {
  return (
    <div className="space-y-3">
      {content.description && (
        <p className="text-[0.83rem] leading-relaxed text-foreground/80">
          <MarkdownText text={content.description} />
        </p>
      )}

      {content.flowSteps && content.flowSteps.length > 0 && <FlowDiagram steps={content.flowSteps} />}

      {content.unorderedList && content.unorderedList.length > 0 && (
        <ul className="space-y-1 pl-4 text-[0.8rem] text-foreground/85">
          {content.unorderedList.map((item, i) => (
            <li key={i} className="list-disc">
              <MarkdownText text={item} />
            </li>
          ))}
        </ul>
      )}

      {content.orderedList && content.orderedList.length > 0 && (
        <ol className="space-y-1 pl-4 text-[0.8rem] text-foreground/85">
          {content.orderedList.map((item, i) => (
            <li key={i} className="list-decimal">
              <MarkdownText text={item} />
            </li>
          ))}
        </ol>
      )}

      {content.useWhen && <UseWhenBox block={content.useWhen} variant="positive" />}

      {content.dontUseWhen && <UseWhenBox block={content.dontUseWhen} variant="negative" />}

      {content.prosCons && <ProsCons pros={content.prosCons.pros} cons={content.prosCons.cons} />}

      {content.badges && content.badges.length > 0 && <BadgeList badges={content.badges} />}

      {content.table && <DecisionTable data={content.table} />}

      {content.codeBlock && <ArchCodeBlock block={content.codeBlock} />}

      {content.infoBoxes && content.infoBoxes.map((box, i) => <InfoBox key={i} box={box} />)}
    </div>
  );
}
