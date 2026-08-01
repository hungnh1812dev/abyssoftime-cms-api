import { unifyFetch } from "@/api/fetcher";
import graphqlApi from "@/api/graphqlApi";
import { registerService } from "@/api/registry";

import { GO_KNOWLEDGE_PAGE_META_QUERY, GO_KNOWLEDGE_SECTION_QUERY } from "./go-knowledge.queries";
import type { GoKnowledgePageMetaData, KnowledgeSection } from "./go-knowledge.types";

export const GO_KNOWLEDGE_META_KEY = "go-knowledge.meta" as const;
export const GO_KNOWLEDGE_SECTION_KEY = "go-knowledge.section" as const;

async function _fetchGoKnowledgeMeta(): Promise<GoKnowledgePageMetaData | null> {
  const data = await graphqlApi.fetch<GoKnowledgePageMetaData>({
    body: { query: GO_KNOWLEDGE_PAGE_META_QUERY },
    selectKey: "goKnowledgePage",
    mock: "go-knowledge-page-meta",
    next: { revalidate: 600, tags: ["knowledge"] },
  });
  return data ?? null;
}

async function _fetchGoKnowledgeSection(params?: unknown): Promise<KnowledgeSection | null> {
  const { id } = (params ?? {}) as { id: string };
  const data = await graphqlApi.fetch<KnowledgeSection>({
    body: { query: GO_KNOWLEDGE_SECTION_QUERY, variables: { id } },
    selectKey: "goKnowledgeSection",
    mock: `go-knowledge-section-${id}`,
    next: { revalidate: 600, tags: ["knowledge"] },
  });
  return data ?? null;
}

registerService({ key: GO_KNOWLEDGE_META_KEY, driver: "graphql", execute: _fetchGoKnowledgeMeta });
registerService({ key: GO_KNOWLEDGE_SECTION_KEY, driver: "graphql", execute: _fetchGoKnowledgeSection });

export async function getGoKnowledgeMeta(): Promise<GoKnowledgePageMetaData | null> {
  return unifyFetch<GoKnowledgePageMetaData | null>({ apiKey: GO_KNOWLEDGE_META_KEY });
}

export async function getGoKnowledgeSection(id: string): Promise<KnowledgeSection | null> {
  return unifyFetch<KnowledgeSection | null>({ apiKey: GO_KNOWLEDGE_SECTION_KEY, params: { id } });
}
