import type { GoKnowledgePageData, KnowledgeSection } from "@/views/learning/develop/go/go-knowledge.types";

import { concurrencySection } from "./concurrency";
import { controlFlowSection } from "./control-flow";
import { errorHandlingSection } from "./error-handling";
import { functionsMethodsSection } from "./functions-methods";
import { interviewQuestionsSection } from "./interview-questions";
import { securitySection } from "./security";
import { standardLibrarySection } from "./standard-library";
import { structsInterfacesGenericsSection } from "./structs-interfaces-generics";
import { syntaxBasicsSection } from "./syntax-basics";
import { testingSection } from "./testing";
import { toolingEcosystemSection } from "./tooling-ecosystem";
import { typesVariablesSection } from "./types-variables";
import { webServerSection } from "./web-server";

export const ALL_SECTIONS: KnowledgeSection[] = [
  syntaxBasicsSection,
  typesVariablesSection,
  controlFlowSection,
  functionsMethodsSection,
  structsInterfacesGenericsSection,
  concurrencySection,
  errorHandlingSection,
  standardLibrarySection,
  webServerSection,
  testingSection,
  securitySection,
  toolingEcosystemSection,
  interviewQuestionsSection,
];

export const GO_KNOWLEDGE_PAGE_DATA: GoKnowledgePageData = {
  sections: ALL_SECTIONS,
};

export const GoKnowledgePageMeta_MockData = {
  data: {
    goKnowledgePage: {
      sections: GO_KNOWLEDGE_PAGE_DATA.sections.map((s) => ({
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

export const goKnowledgeSectionMocks = Object.fromEntries(ALL_SECTIONS.map((section) => [`go-knowledge-section-${section.id}`, { data: { goKnowledgeSection: section } }]));
