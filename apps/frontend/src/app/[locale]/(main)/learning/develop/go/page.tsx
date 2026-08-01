import type { Metadata } from "next";

import { getGoKnowledgeMeta } from "@/views/learning/develop/go/go-knowledge.service";
import GoKnowledgePage from "@/views/learning/develop/go/GoKnowledgePage";

export const metadata: Metadata = {
  title: "Go Knowledge Base",
  description: "Tổng hợp kiến thức Go: syntax, type system, standard library, concurrency, web server, testing và security.",
};

interface PageProps {
  searchParams: Promise<{ section?: string; q?: string }>;
}

export default async function GoKnowledgeIndexPage({ searchParams }: PageProps) {
  const params = await searchParams;

  const meta = await getGoKnowledgeMeta();
  const sections = meta?.sections ?? [];

  const activeSectionId = params.section ?? sections[0]?.id ?? "";
  const searchQuery = params.q?.trim() || undefined;
  const totalTopics = sections.reduce((acc, s) => acc + s.itemCount, 0);

  return <GoKnowledgePage sections={sections} activeSectionId={activeSectionId} searchQuery={searchQuery} totalTopics={totalTopics} />;
}
