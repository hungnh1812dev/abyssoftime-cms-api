import type { Metadata } from "next";

import { getArchitectureKnowledgeMeta } from "@/views/learning/develop/architecture/architecture-knowledge.service";
import ArchitectureKnowledgePage from "@/views/learning/develop/architecture/ArchitectureKnowledgePage";

export const metadata: Metadata = {
  title: "Architecture & Design Patterns",
  description: "Tổng hợp kiến thức kiến trúc phần mềm: System Architecture, Software Architecture, SOLID principles, Creational, Structural và Behavioral patterns.",
};

interface PageProps {
  searchParams: Promise<{ section?: string; q?: string }>;
}

export default async function ArchitectureKnowledgeIndexPage({ searchParams }: PageProps) {
  const params = await searchParams;

  const meta = await getArchitectureKnowledgeMeta();
  const sections = meta?.sections ?? [];

  const activeSectionId = params.section ?? sections[0]?.id ?? "";
  const searchQuery = params.q?.trim() || undefined;
  const totalTopics = sections.reduce((acc, s) => acc + s.itemCount, 0);

  return <ArchitectureKnowledgePage sections={sections} activeSectionId={activeSectionId} searchQuery={searchQuery} totalTopics={totalTopics} />;
}
