import graphqlApi from "@/api/graphqlApi";

import { GET_WORD_DETAIL, GET_WORD_GROUPS, GET_WORD_LIST } from "./en-vocab-v2.queries";
import type { VocabPackPage, VocabWord, VocabWordPage } from "./en-vocab-v2.types";

const DEFAULT_PACK_SIZE = 10;
const DEFAULT_GROUP_PAGE_SIZE = 10 * DEFAULT_PACK_SIZE; // 100

export async function getWordList(page: number, pageSize = DEFAULT_PACK_SIZE): Promise<VocabWordPage> {
  return graphqlApi.fetch<VocabWordPage>({
    body: { query: GET_WORD_LIST, variables: { page, pageSize } },
    selectKey: "enItVocabs",
    mock: "en-vocab-word-list",
    next: { revalidate: 300, tags: ["en-vocab"] },
  });
}

export async function getWordGroups(page: number, pageSize: number = DEFAULT_GROUP_PAGE_SIZE): Promise<VocabPackPage> {
  return graphqlApi.fetch<VocabPackPage>({
    body: { query: GET_WORD_GROUPS, variables: { page, pageSize } },
    selectKey: "enItVocabs",
    mock: "en-vocab-word-groups",
    next: { revalidate: 300, tags: ["en-vocab"] },
  });
}

export async function getWordDetail(word: string): Promise<VocabWord | null> {
  const result = await graphqlApi.fetch<VocabWordPage>({
    body: { query: GET_WORD_DETAIL, variables: { word } },
    selectKey: "enItVocabs",
    next: { revalidate: 300, tags: ["en-vocab"] },
  });
  return result.items[0] ?? null;
}

// export function buildPageMetas(data: VocabPackPage): GroupMeta[][] {
//   const packSize = 10;
//   const groupSize = 10 * packSize; // 100
//   // function* groupIterator(items: { wordGroup: string }[], step: number): Generator<string> {
//   //   for (let i = 0; i < items.length; i += step) {
//   //     yield items[i].wordGroup || "Unknown";
//   //   }
//   // }
//   // const groups = [...groupIterator(data.items, pageSize)];
//   const groupCount = Math.ceil(data.meta.pagination.total / groupSize);
//   const packCount = Math.ceil(data.meta.pagination.total / packSize);

//   // return Array.from({ length: packCount }, (_, i) => ({
//   //   pack: i + 1,
//   //   label: `Pack ${i + 1}`,
//   //   description: null,
//   // }));
//   return Array.from({ length: groupCount }, (_, gIdx) => {
//     return Array.from({ length: 10 }, (_, pIdx) => {
//       const packNumber = gIdx * 10 + pIdx + 1;
//       if (packNumber > packCount) return null;
//       return {
//         pack: packNumber,
//         label: `Pack ${packNumber}`,
//         description: null,
//       };
//     }).filter((item) => item !== null);
//   });
// }
