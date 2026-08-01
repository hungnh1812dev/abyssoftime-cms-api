import { unifyFetch } from "@/api/fetcher";
import graphqlApi from "@/api/graphqlApi";
import { registerService } from "@/api/registry";

import { ARCHITECTURE_KNOWLEDGE_PAGE_META_QUERY, ARCHITECTURE_KNOWLEDGE_SECTION_QUERY } from "./architecture-knowledge.queries";
import type { ArchitecturePageMetaData, ArchitectureSection } from "./data/types";

export const ARCH_META_KEY = "architecture-knowledge.meta" as const;
export const ARCH_SECTION_KEY = "architecture-knowledge.section" as const;

async function _fetchArchMeta(): Promise<ArchitecturePageMetaData | null> {
  const data = await graphqlApi.fetch<ArchitecturePageMetaData>({
    body: { query: ARCHITECTURE_KNOWLEDGE_PAGE_META_QUERY },
    selectKey: "architectureKnowledgePage",
    mock: "architecture-knowledge-meta",
    next: { revalidate: 600, tags: ["knowledge"] },
  });
  return data ?? null;
}

async function _fetchArchSection(params?: unknown): Promise<ArchitectureSection | null> {
  const { id } = (params ?? {}) as { id: string };
  const data = await graphqlApi.fetch<ArchitectureSection>({
    body: { query: ARCHITECTURE_KNOWLEDGE_SECTION_QUERY, variables: { id } },
    selectKey: "architectureKnowledgeSection",
    mock: `architecture-knowledge-section-${id}`,
    next: { revalidate: 600, tags: ["knowledge"] },
  });
  return data ?? null;
}

registerService({ key: ARCH_META_KEY, driver: "graphql", execute: _fetchArchMeta });
registerService({ key: ARCH_SECTION_KEY, driver: "graphql", execute: _fetchArchSection });

export async function getArchitectureKnowledgeMeta(): Promise<ArchitecturePageMetaData | null> {
  return unifyFetch<ArchitecturePageMetaData | null>({ apiKey: ARCH_META_KEY });
}

export async function getArchitectureKnowledgeSection(id: string): Promise<ArchitectureSection | null> {
  return unifyFetch<ArchitectureSection | null>({ apiKey: ARCH_SECTION_KEY, params: { id } });
}
