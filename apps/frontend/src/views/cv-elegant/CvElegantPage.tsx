import { getCommonText } from "@/views/cv/common-text.service";
import { getContact } from "@/views/cv/contact.service";

import { getCvElegantList, getMainCvElegant } from "./cv-elegant.service";
import { CvElegantPageContent } from "./CvElegantPageContent";
import { CvElegantCompanyDropdown } from "./footer/CvElegantCompanyDropdown";

export type { CvElegantPageDataType, CvElegantListItemType } from "./cv-elegant.types";
export type { CvContactType } from "@/views/cv/contact.types";
export type { CommonTextType } from "@/views/cv/common-text.types";

const CvElegantPage = async () => {
  const [mainCv, cvList, contact, commonText] = await Promise.all([getMainCvElegant(), getCvElegantList(), getContact(), getCommonText()]);

  return <CvElegantPageContent data={mainCv!} contact={contact!} commonText={commonText!} actionBarExtra={<CvElegantCompanyDropdown items={cvList} />} />;
};

export default CvElegantPage;
