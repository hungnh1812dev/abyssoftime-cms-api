import type { CommonTextType } from "@/views/cv/common-text.types";
import type { CvContactType } from "@/views/cv/contact.types";
import { PrintButton } from "@/views/cv/footer/PrintButton";

import type { CvElegantPageDataType } from "./cv-elegant.types";
import styles from "./CvElegantPage.module.css";
import { CvElegantEducation } from "./education/CvElegantEducation";
import { CvElegantExperience } from "./experience/CvElegantExperience";
import { CvElegantHeader } from "./header/CvElegantHeader";
import { CvElegantLanguages } from "./languages/CvElegantLanguages";
import { CvElegantProjects } from "./projects/CvElegantProjects";
import { CvElegantReferences } from "./references/CvElegantReferences";
import { CvElegantSkills } from "./skills/CvElegantSkills";
import { CvElegantSummary } from "./summary/CvElegantSummary";

interface CvElegantPageContentProps {
  data: CvElegantPageDataType;
  contact: CvContactType;
  commonText: CommonTextType;
  actionBarExtra?: React.ReactNode;
}

export const CvElegantPageContent = ({ data, contact, commonText, actionBarExtra }: CvElegantPageContentProps) => {
  return (
    <div className={`relative mx-auto max-w-[800px] overflow-hidden bg-background text-foreground/90 shadow-md sm:my-6 sm:rounded-lg ${styles.cvContainer}`}>
      <CvElegantHeader contact={contact} position={data.position} />

      <div className="px-5 py-2 sm:px-8">
        <CvElegantSummary summary={data.summary} commonText={commonText} />
        <CvElegantSkills skills={data.skills} commonText={commonText} />
        <CvElegantExperience experiences={data.experiences} commonText={commonText} />
        <CvElegantProjects projects={data.projects} commonText={commonText} />
        <CvElegantEducation educations={data.educations} commonText={commonText} />
        <CvElegantLanguages languages={data.languages} commonText={commonText} />
        <CvElegantReferences references={data.references} commonText={commonText} />
      </div>

      <div className={`flex items-center justify-center gap-3 px-5 py-4 sm:px-8 ${styles.printHide}`}>
        {actionBarExtra}
        <PrintButton />
      </div>
    </div>
  );
};
