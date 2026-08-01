import type { CvPageDataType } from "../CvPage";

import styles from "./CvSectionSkills.module.css";

const sectionHeadingClass = "mb-2.5 border-b-2 border-blue-600/20 pb-1.5 text-sm font-bold uppercase tracking-widest text-blue-700 dark:text-blue-400";

interface CvSectionSkillsProps {
  skills: CvPageDataType["skills"];
}

export const CvSectionSkills = ({ skills }: CvSectionSkillsProps) => {
  return (
    <section id="skills" className={`mb-7 ${styles.section}`}>
      <h3 className={sectionHeadingClass}>{skills.name}</h3>
      <div className={`columns-2 gap-x-6 md:columns-3 ${styles.skillsGrid}`}>
        {skills.items.map((skillCategory, index) => (
          <div key={index} className="mb-2.5 break-inside-avoid">
            <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-blue-600/70 dark:text-blue-400/70">{skillCategory.category}</p>
            {skillCategory.items[0]?.exp ? (
              <div className="space-y-0.5">
                {skillCategory.items.map((skill, skillIndex) => (
                  <div key={skillIndex} className="flex items-baseline justify-between gap-2">
                    <span className="text-xs text-foreground/80">{skill.name}</span>
                    {skill.exp && <span className="shrink-0 text-[10px] text-foreground/40">{skill.exp}</span>}
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-wrap gap-1">
                {skillCategory.items.map((skill, skillIndex) => (
                  <span key={skillIndex} className="rounded border border-border/60 bg-muted px-1.5 py-0.5 text-xs text-foreground/55">
                    {skill.name}
                  </span>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
};
