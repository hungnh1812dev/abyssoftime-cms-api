import type { CommonTextType, CvPageDataType } from "../CvPage";

import { HTMLParser } from "@/lib/html-parser";

import styles from "./CvSectionExperience.module.css";

const sectionHeadingClass = "mb-2.5 border-b-2 border-blue-600/20 pb-1.5 text-sm font-bold uppercase tracking-widest text-blue-700 dark:text-blue-400";

interface CvSectionExperienceProps {
  experiences: CvPageDataType["experiences"];
  commonText: CommonTextType;
}

export const CvSectionExperience = ({ experiences, commonText }: CvSectionExperienceProps) => {
  return (
    <section id="experience" className={`mb-7 ${styles.section}`}>
      <h3 className={sectionHeadingClass}>{experiences.name}</h3>
      <div className="divide-y divide-border/30">
        {experiences.items.map((group, groupIndex) => (
          <div key={`company-${groupIndex}`} className={`pt-5 first:pt-0 ${styles.item}`}>
            <p>
              <span className="text-base font-semibold text-blue-700/80 dark:text-blue-400/80">{group.company}</span>
              <span className="ml-1.5 text-xs text-foreground/50">· {group.location}</span>
            </p>
            <div className="mt-2">
              {group.roles.map((role, roleIndex) => (
                <div key={`role-${roleIndex}`} className="pt-2.5 first:pt-0">
                  <div className="flex flex-col gap-0.5 sm:flex-row sm:items-baseline sm:justify-between">
                    <h4 className="text-sm font-bold">{role.position}</h4>
                    <span className="text-xs text-foreground/50">{role.period}</span>
                  </div>
                  {role.projects && (
                    <p className="mt-1.5 text-xs text-foreground/75">
                      <span className="font-semibold text-blue-600/70 dark:text-blue-400/70">{commonText.text["projects"]}: </span>
                      {role.projects}
                    </p>
                  )}
                  {role.techStack && role.techStack.length > 0 && (
                    <div className="mt-1.5 flex">
                      <span className="top-1 mr-1 inline-block text-xs font-semibold tracking-widest text-blue-600/70 dark:text-blue-400/70">
                        {commonText.text["technologies"]}:
                      </span>
                      <div className="flex flex-1 flex-wrap gap-1">
                        {role.techStack.map((tech) => (
                          <span key={tech} className="rounded border border-border/60 bg-muted px-1.5 py-0.5 text-xs text-foreground/55">
                            {tech}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  <p className="mb-0 mt-1 text-xs font-semibold text-blue-600/70 dark:text-blue-400/70">{commonText.text["responsibilities-contributions"]}:</p>
                  <HTMLParser content={role.responsibilities} className="text-sm [&>li]:pb-1 [&>ul]:list-disc [&>ul]:pl-5 [&>ul]:pt-0.5" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};
