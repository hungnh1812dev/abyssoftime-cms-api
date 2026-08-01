import type { CvPageDataType } from "../CvPage";

import styles from "./CvSectionLanguages.module.css";

const sectionHeadingClass = "mb-2.5 border-b-2 border-blue-600/20 pb-1.5 text-sm font-bold uppercase tracking-widest text-blue-700 dark:text-blue-400";

interface CvSectionLanguagesProps {
  languages: CvPageDataType["languages"];
}

export const CvSectionLanguages = ({ languages }: CvSectionLanguagesProps) => {
  return (
    <section id="languages" className={`${styles.section}`}>
      <h3 className={sectionHeadingClass}>{languages.name}</h3>
      <div className="flex flex-wrap gap-x-6 gap-y-1">
        {languages.items.map((lang, idx) => (
          <div key={idx} className="text-sm">
            <span className="font-semibold">{lang.language}</span>
            <span className="ml-1.5 text-xs text-foreground/55">{lang.level}</span>
          </div>
        ))}
      </div>
    </section>
  );
};
