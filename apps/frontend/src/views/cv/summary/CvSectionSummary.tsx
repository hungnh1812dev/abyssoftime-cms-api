import type { CvPageDataType } from "../CvPage";

import { HTMLParser } from "@/lib/html-parser";

import styles from "./CvSectionSummary.module.css";

const sectionHeadingClass = "mb-2.5 border-b-2 border-blue-600/20 pb-1.5 text-sm font-bold uppercase tracking-widest text-blue-700 dark:text-blue-400";

interface CvSectionSummaryProps {
  summary: CvPageDataType["summary"];
}

export const CvSectionSummary = ({ summary }: CvSectionSummaryProps) => {
  return (
    <section id="summary" className={`mb-7 ${styles.section}`}>
      <h3 className={sectionHeadingClass}>{summary.name}</h3>
      <HTMLParser className="text-sm text-foreground/80 [&>p]:m-0 [&>p]:leading-relaxed" content={summary.description} />
    </section>
  );
};
