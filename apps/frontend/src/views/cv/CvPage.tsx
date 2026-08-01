import { getCommonText } from "@/views/cv/common-text.service";
import { getContact } from "@/views/cv/contact.service";
import { getCvList, getMainCv } from "@/views/cv/cv.service";

import { CvPageContent } from "./CvPageContent";
import { CvCompanyDropdown } from "./footer/CvCompanyDropdown";

// Re-export types consumed by cv/[documentId]/page.tsx and other files
export type { CvPageDataType, CvCollectionItemType, CvListItemType } from "@/views/cv/cv.types";
export type { CvContactType } from "@/views/cv/contact.types";
export type { CommonTextType } from "@/views/cv/common-text.types";

const CvPage = async () => {
  const [mainCv, cvList, contact, commonText] = await Promise.all([getMainCv(), getCvList(), getContact(), getCommonText()]);

  return <CvPageContent data={mainCv!} contact={contact!} commonText={commonText!} actionBarExtra={<CvCompanyDropdown items={cvList} />} />;
};

export default CvPage;
