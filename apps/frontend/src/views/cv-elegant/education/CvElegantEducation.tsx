import type { CvElegantPageDataType } from "../cv-elegant.types";
import { CvElegantSection } from "../shared/CvElegantSection";

import { HTMLParser } from "@/lib/html-parser";
import type { CommonTextType } from "@/views/cv/common-text.types";

interface CvElegantEducationProps {
  educations: CvElegantPageDataType["educations"];
  commonText: CommonTextType;
}

export const CvElegantEducation = ({ educations, commonText }: CvElegantEducationProps) => {
  return (
    <CvElegantSection title={commonText.text["education"] ?? "Education"} id="education">
      <div className="space-y-4">
        {educations.map((item, idx) => (
          <div key={idx} className="print:break-inside-avoid">
            <h4 className="text-sm font-bold">{item.institution}</h4>
            <p className="mt-0.5 text-sm text-foreground/60">
              <span>{item.period}</span>
              <span className="mx-2 text-foreground/30">|</span>
              <span>{item.degree}</span>
            </p>
            {item.description && <HTMLParser content={item.description} className="mt-1 text-sm text-foreground/70" />}
          </div>
        ))}
      </div>
    </CvElegantSection>
  );
};
