import type { CvElegantPageDataType } from "../cv-elegant.types";
import { CvElegantSection } from "../shared/CvElegantSection";

import { HTMLParser } from "@/lib/html-parser";
import type { CommonTextType } from "@/views/cv/common-text.types";

interface CvElegantExperienceProps {
  experiences: CvElegantPageDataType["experiences"];
  commonText: CommonTextType;
}

export const CvElegantExperience = ({ experiences, commonText }: CvElegantExperienceProps) => {
  return (
    <CvElegantSection title={commonText.text["work-experience"] ?? "Work Experience"} id="experience">
      <div className="space-y-5">
        {experiences.map((group, groupIdx) => (
          <div key={groupIdx}>
            {group.roles.map((role, roleIdx) => (
              <div key={roleIdx} className="pt-3 first:pt-0 print:break-inside-avoid">
                <p className="text-xs font-medium text-foreground/50">{role.period}</p>
                <p className="mt-0.5">
                  <span className="text-sm font-bold uppercase">{role.position}</span>
                  <span className="mx-2 text-foreground/30">|</span>
                  <span className="text-sm text-foreground/60">{group.company}</span>
                </p>
                <HTMLParser content={role.responsibilities} className="mt-1 text-sm text-foreground/75 [&>li]:pb-0.5 [&>ul]:list-disc [&>ul]:pl-5 [&>ul]:pt-0.5" />
                {role.techStack && role.techStack.length > 0 && (
                  <div className="mt-1.5 flex flex-wrap items-start gap-x-2">
                    <span className="text-xs font-semibold text-foreground/50">{commonText.text["technologies"] ?? "Technologies"}:</span>
                    <div className="flex flex-1 flex-wrap gap-1">
                      {role.techStack.map((tech) => (
                        <span key={tech} className="rounded-full border border-border/60 bg-muted px-2 py-0.5 text-xs text-foreground/55">
                          {tech}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        ))}
      </div>
    </CvElegantSection>
  );
};
