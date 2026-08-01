import type { CvElegantPageDataType } from "../cv-elegant.types";
import { CvElegantSection } from "../shared/CvElegantSection";

import type { CommonTextType } from "@/views/cv/common-text.types";

interface CvElegantSkillsProps {
  skills: CvElegantPageDataType["skills"];
  commonText: CommonTextType;
}

export const CvElegantSkills = ({ skills, commonText }: CvElegantSkillsProps) => {
  return (
    <CvElegantSection title={commonText.text["skill"] ?? "Skill"} id="skills">
      <div className="space-y-3">
        {skills.map((group, idx) => {
          const items = group.skill
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean);
          return (
            <div key={idx} className="flex flex-wrap items-start gap-x-4 gap-y-1.5 print:break-inside-avoid">
              <span className="w-36 shrink-0 text-sm font-semibold">{group.level}</span>
              <div className="flex flex-1 flex-wrap gap-1.5">
                {items.map((item) => (
                  <span key={item} className="rounded-full border border-border/60 bg-muted px-2.5 py-0.5 text-xs text-foreground/70">
                    {item}
                  </span>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </CvElegantSection>
  );
};
