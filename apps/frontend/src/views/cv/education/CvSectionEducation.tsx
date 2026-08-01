import type { CvPageDataType } from "../CvPage";

import { HTMLParser } from "@/lib/html-parser";

import styles from "./CvSectionEducation.module.css";

const sectionHeadingClass = "mb-2.5 border-b-2 border-blue-600/20 pb-1.5 text-sm font-bold uppercase tracking-widest text-blue-700 dark:text-blue-400";

interface CvSectionEducationProps {
  education: CvPageDataType["education"];
}

export const CvSectionEducation = ({ education }: CvSectionEducationProps) => {
  return (
    <section id="education" className={`mb-7 ${styles.section}`}>
      <h3 className={sectionHeadingClass}>{education.name}</h3>
      <div className="divide-y divide-border/30">
        {education.items.map((item, idx) => (
          <div key={`education-${idx}`} className={`pt-4 first:pt-0 ${styles.item}`}>
            <div className="flex flex-col gap-0.5 sm:flex-row sm:items-baseline sm:justify-between">
              <h4 className="text-sm font-bold">{item.degree}</h4>
              <span className="text-xs italic text-foreground/50">{item.period}</span>
            </div>
            <p className="mt-0.5 text-xs font-semibold text-foreground/55">
              {item.institution} · {item.location}
            </p>
            {item.description && <HTMLParser content={item.description} className="mt-1 text-sm" />}
          </div>
        ))}
      </div>
    </section>
  );
};
