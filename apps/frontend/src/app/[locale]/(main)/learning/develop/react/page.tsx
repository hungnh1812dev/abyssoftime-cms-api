import type { Metadata } from "next";

import { getReactKnowledgeMeta } from "@/views/learning/develop/react/react-knowledge.service";
import ReactKnowledgePage from "@/views/learning/develop/react/ReactKnowledgePage";

export const metadata: Metadata = {
  title: "React Knowledge Base",
  description: "Tổng hợp kiến thức Frontend: JavaScript, TypeScript, Browser APIs, React lifecycle, tất cả React hooks với render phase, Next.js và AI.",
};

interface PageProps {
  searchParams: Promise<{ section?: string; q?: string }>;
}

export default async function ReactKnowledgeIndexPage({ searchParams }: PageProps) {
  const params = await searchParams;

  const meta = await getReactKnowledgeMeta();
  const sections = meta?.sections ?? [];

  const activeSectionId = params.section ?? sections[0]?.id ?? "";
  const searchQuery = params.q?.trim() || undefined;
  const totalTopics = sections.reduce((acc, s) => acc + s.itemCount, 0);

  return <ReactKnowledgePage sections={sections} activeSectionId={activeSectionId} searchQuery={searchQuery} totalTopics={totalTopics} />;
}
