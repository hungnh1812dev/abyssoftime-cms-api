import type { CvCollectionItemType } from "@/views/cv/CvPage";

import { CVPage_MockData } from "./cv-page";

export const CVMain_MockData: CvCollectionItemType[] = [
  {
    documentId: "main-cv-001",
    isMain: true,
    companyName: "Main CV",
    ...CVPage_MockData,
  },
];
