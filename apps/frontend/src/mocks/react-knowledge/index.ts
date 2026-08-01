import type { ReactKnowledgePageData, ReactKnowledgePageMetaData } from "@/views/learning/develop/react/react-knowledge.types";

import { aiSection } from "./ai";
import { algorithmsSection } from "./algorithms";
import { browserSection } from "./browser";
import { buildToolsSection } from "./build-tools";
import { cicdSection } from "./cicd";
import { dataFetchingSection } from "./data-fetching";
import { designPatternsSection } from "./design-patterns";
import { javascriptSection } from "./javascript";
import { k8sSection } from "./k8s";
import { nextjsSection } from "./nextjs";
import { optimizeSection } from "./optimize";
import { reactCoreSection } from "./react-core";
import { reactHooksSection } from "./react-hooks";
import { securitySection } from "./security";
import { stateManagementSection } from "./state-management";
import { stylingSection } from "./styling";
import { testingSection } from "./testing";
import { typescriptSection } from "./typescript";

export const ALL_SECTIONS = [
  javascriptSection,
  typescriptSection,
  browserSection,
  reactCoreSection,
  reactHooksSection,
  stateManagementSection,
  dataFetchingSection,
  nextjsSection,
  stylingSection,
  aiSection,
  optimizeSection,
  testingSection,
  securitySection,
  k8sSection,
  cicdSection,
  designPatternsSection,
  algorithmsSection,
  buildToolsSection,
];

export const REACT_KNOWLEDGE_PAGE_DATA: ReactKnowledgePageData = {
  sections: ALL_SECTIONS,
};

export const ReactKnowledgePage_MockData = {
  data: {
    reactKnowledgePage: {
      sections: ALL_SECTIONS,
    },
  },
};

export const ReactKnowledgePageMeta_MockData = {
  data: {
    reactKnowledgePage: {
      sections: REACT_KNOWLEDGE_PAGE_DATA.sections.map((s) => ({
        id: s.id,
        title: s.title,
        icon: s.icon,
        description: s.description,
        style: s.style,
        itemCount: s.items.length,
      })),
    },
  },
};

export const reactKnowledgeSectionMocks = Object.fromEntries(
  ALL_SECTIONS.map((section) => [`react-knowledge-section-${section.id}`, { data: { reactKnowledgeSection: section } }]),
);
