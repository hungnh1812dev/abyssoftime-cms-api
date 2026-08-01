import type { Metadata } from "next";

import type { BasePageProps } from "@/types/BasicType";
import EnglishV2Page from "@/views/learning/english-v2/EnglishV2Page";

export const metadata: Metadata = {
  title: "EN Vocabulary",
  description: "Học 3000 từ vựng giao tiếp tiếng Anh thông dụng theo từng pack.",
};

export default async function LearningEnglishPage({ searchParams }: BasePageProps) {
  return <EnglishV2Page searchParams={searchParams} />;
}
