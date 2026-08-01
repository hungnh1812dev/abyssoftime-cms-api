import { parseIntParam, toPackIdx } from "@/views/learning/english-v2/en-vocab-v2.pagination";
import { getWordGroups, getWordList } from "@/views/learning/english-v2/en-vocab-v2.service";

import { EnglishV2View } from "./EnglishV2View";

interface EnglishV2PageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

function firstParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

const EnglishV2Page = async ({ searchParams }: EnglishV2PageProps) => {
  const resolvedParams = await searchParams;
  const initialGroupIdx = parseIntParam(firstParam(resolvedParams.group), 1);
  const initialPackIdx = parseIntParam(firstParam(resolvedParams.pack), 1);

  const [initialPage, wordGroups] = await Promise.all([getWordList(1), getWordGroups(initialGroupIdx)]);

  return <EnglishV2View initialGroup={wordGroups} initialPage={initialPage} initialGroupIdx={initialGroupIdx} initialPackIdx={initialPackIdx} />;
};

export default EnglishV2Page;
