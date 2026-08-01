import type { ArchitecturePageMetaData } from "@/views/learning/develop/architecture/data/types";
import { viSections } from "@/views/learning/develop/architecture/data/vi";

export const ALL_ARCH_SECTIONS = viSections;

export const ArchitectureKnowledgePage_MockData = {
  data: {
    architectureKnowledgePage: {
      sections: ALL_ARCH_SECTIONS,
    },
  },
};

const metaSections: ArchitecturePageMetaData["sections"] = ALL_ARCH_SECTIONS.map((s) => ({
  id: s.id,
  title: s.title,
  icon: s.icon,
  description: s.description,
  style: s.style,
  itemCount: s.cards.length,
}));

export const ArchitectureKnowledgePageMeta_MockData = {
  data: {
    architectureKnowledgePage: {
      sections: metaSections,
    },
  },
};

export const architectureKnowledgeSectionMocks = Object.fromEntries(
  ALL_ARCH_SECTIONS.map((section) => [`architecture-knowledge-section-${section.id}`, { data: { architectureKnowledgeSection: section } }]),
);
