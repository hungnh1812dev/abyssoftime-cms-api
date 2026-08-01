"use server";

import { getWordDetail, getWordGroups, getWordList } from "@/views/learning/english-v2/en-vocab-v2.service";
import type { VocabPackPage, VocabWord, VocabWordPage } from "@/views/learning/english-v2/en-vocab-v2.types";

export async function fetchWordList(pack: number): Promise<VocabWordPage> {
  return getWordList(pack);
}

export async function fetchPackList(group: number): Promise<VocabPackPage> {
  return getWordGroups(group);
}

export async function fetchWordDetail(word: string): Promise<VocabWord | null> {
  return getWordDetail(word);
}
