import type { CommonTextType, CvContactType, CvPageDataType } from "./CvPage";
import styles from "./CvPage.module.css";
import { CvSectionEducation } from "./education/CvSectionEducation";
import { CvSectionExperience } from "./experience/CvSectionExperience";
import { PrintButton } from "./footer/PrintButton";
import { CvHeader } from "./header/CvHeader";
import { CvSectionLanguages } from "./languages/CvSectionLanguages";
import { CvSectionProjects } from "./projects/CvSectionProjects";
import { CvSectionSkills } from "./skills/CvSectionSkills";
import { CvSectionSummary } from "./summary/CvSectionSummary";

interface CvPageContentProps {
  data: CvPageDataType;
  contact: CvContactType;
  commonText: CommonTextType;
  actionBarExtra?: React.ReactNode;
}

export const CvPageContent = ({ data, contact, commonText, actionBarExtra }: CvPageContentProps) => {
  return (
    <div className={`relative mx-auto max-w-[800px] bg-background px-5 py-6 leading-normal text-foreground/90 sm:px-8 sm:py-8 ${styles.cvContainer}`}>
      <CvHeader contact={contact} position={data.position} />

      {/* Anchor Navigation */}
      <nav className={`mb-3 hidden justify-center gap-5 text-xs font-medium uppercase tracking-wider text-foreground/45 sm:flex ${styles.printHide}`}>
        {["Summary", "Skills", "Experience", "Projects", "Education", "Languages"].map((s) => (
          <a key={s} href={`#${s.toLowerCase()}`} className="transition-colors hover:text-foreground hover:underline">
            {s}
          </a>
        ))}
      </nav>

      <div>
        <CvSectionSummary summary={data.summary} />
        <CvSectionSkills skills={data.skills} />
        <CvSectionExperience experiences={data.experiences} commonText={commonText} />
        <CvSectionProjects projects={data.projects} commonText={commonText} />
        <CvSectionEducation education={data.education} />
        <CvSectionLanguages languages={data.languages} />
      </div>

      {/* Action Bar */}
      <div className={`mt-5 flex items-center justify-center gap-3 ${styles.printHide}`}>
        {actionBarExtra}
        <PrintButton />
      </div>
    </div>
  );
};
