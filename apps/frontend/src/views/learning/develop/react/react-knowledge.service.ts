import { unifyFetch } from "@/api/fetcher";
import graphqlApi from "@/api/graphqlApi";
import { registerService } from "@/api/registry";

import { REACT_KNOWLEDGE_PAGE_META_QUERY, REACT_KNOWLEDGE_SECTION_QUERY } from "./react-knowledge.queries";
import type { KnowledgeSection, ReactKnowledgePageMetaData } from "./react-knowledge.types";

export const KNOWLEDGE_META_KEY = "react-knowledge.meta" as const;
export const KNOWLEDGE_SECTION_KEY = "react-knowledge.section" as const;

async function _fetchKnowledgeMeta(): Promise<ReactKnowledgePageMetaData | null> {
  const data = await graphqlApi.fetch<ReactKnowledgePageMetaData>({
    body: { query: REACT_KNOWLEDGE_PAGE_META_QUERY },
    selectKey: "reactKnowledgePage",
    mock: "react-knowledge-page-meta",
    next: { revalidate: 600, tags: ["knowledge"] },
  });
  return data ?? null;
}

async function _fetchKnowledgeSection(params?: unknown): Promise<KnowledgeSection | null> {
  const { id } = (params ?? {}) as { id: string };
  const data = await graphqlApi.fetch<KnowledgeSection>({
    body: { query: REACT_KNOWLEDGE_SECTION_QUERY, variables: { id } },
    selectKey: "reactKnowledgeSection",
    mock: `react-knowledge-section-${id}`,
    next: { revalidate: 600, tags: ["knowledge"] },
  });
  return data ?? null;
}

registerService({ key: KNOWLEDGE_META_KEY, driver: "graphql", execute: _fetchKnowledgeMeta });
registerService({ key: KNOWLEDGE_SECTION_KEY, driver: "graphql", execute: _fetchKnowledgeSection });

export async function getReactKnowledgeMeta(): Promise<ReactKnowledgePageMetaData | null> {
  return unifyFetch<ReactKnowledgePageMetaData | null>({ apiKey: KNOWLEDGE_META_KEY });
}

export async function getReactKnowledgeSection(id: string): Promise<KnowledgeSection | null> {
  return unifyFetch<KnowledgeSection | null>({ apiKey: KNOWLEDGE_SECTION_KEY, params: { id } });
}
