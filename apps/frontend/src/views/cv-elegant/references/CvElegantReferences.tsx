import type { CvElegantPageDataType } from "../cv-elegant.types";
import { CvElegantSection } from "../shared/CvElegantSection";

import type { CommonTextType } from "@/views/cv/common-text.types";

interface CvElegantReferencesProps {
  references: CvElegantPageDataType["references"];
  commonText: CommonTextType;
}

export const CvElegantReferences = ({ references, commonText }: CvElegantReferencesProps) => {
  if (!references || references.length === 0) return null;

  return (
    <CvElegantSection title={commonText.text["references"] ?? "References"} id="references">
      <div className="flex flex-wrap gap-x-10 gap-y-3">
        {references.map((ref, idx) => (
          <div key={idx} className="text-sm">
            <div className="font-semibold">{ref.name}</div>
            {ref.role && <div className="text-xs text-foreground/55">{ref.role}</div>}
            {ref.phone && (
              <div className="text-xs font-semibold">
                {commonText.text["phone"] ?? "Phone"}:{" "}
                <a href={`tel:${ref.phone}`} className="text-xs text-foreground/55 hover:text-foreground hover:underline">
                  {ref.phone}
                </a>
              </div>
            )}
          </div>
        ))}
      </div>
    </CvElegantSection>
  );
};
