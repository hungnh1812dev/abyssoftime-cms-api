import { CvElegantSection } from "../shared/CvElegantSection";

import { HTMLParser } from "@/lib/html-parser";
import type { CommonTextType } from "@/views/cv/common-text.types";

interface CvElegantSummaryProps {
  summary: string;
  commonText: CommonTextType;
}

export const CvElegantSummary = ({ summary, commonText }: CvElegantSummaryProps) => {
  return (
    <CvElegantSection title={commonText.text["about-me"] ?? "About Me"} id="about-me">
      <HTMLParser className="text-sm leading-relaxed text-foreground/80 [&>p]:m-0" content={summary} />
    </CvElegantSection>
  );
};
