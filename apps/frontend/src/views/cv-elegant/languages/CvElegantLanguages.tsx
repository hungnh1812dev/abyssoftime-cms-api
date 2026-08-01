import type { CvElegantPageDataType } from "../cv-elegant.types";
import { CvElegantSection } from "../shared/CvElegantSection";

import type { CommonTextType } from "@/views/cv/common-text.types";

interface CvElegantLanguagesProps {
  languages: CvElegantPageDataType["languages"];
  commonText: CommonTextType;
}

export const CvElegantLanguages = ({ languages, commonText }: CvElegantLanguagesProps) => {
  return (
    <CvElegantSection title={commonText.text["languages"] ?? "Languages"} id="languages">
      <div className="flex flex-wrap gap-x-6 gap-y-1">
        {languages.map((lang, idx) => (
          <div key={idx} className="text-sm">
            <span className="font-semibold">{lang.language}</span>
            <span className="ml-1.5 text-xs text-foreground/55">{lang.level}</span>
          </div>
        ))}
      </div>
    </CvElegantSection>
  );
};
