import { unifyFetch } from "@/api/fetcher";
import graphqlApi from "@/api/graphqlApi";
import { registerService } from "@/api/registry";

import { GET_COMMON_TEXT } from "./common-text.queries";
import type { CommonTextType } from "./common-text.types";

export const COMMON_TEXT_KEY = "common-text" as const;

async function _fetchCommonText(): Promise<CommonTextType | null> {
  const data = await graphqlApi.fetch<CommonTextType>({
    body: { query: GET_COMMON_TEXT },
    selectKey: "commonText",
    mock: "cv-common-text",
    next: { revalidate: 300, tags: ["cv"] },
  });
  return data ?? null;
}

registerService({ key: COMMON_TEXT_KEY, driver: "graphql", execute: _fetchCommonText });

export async function getCommonText(): Promise<CommonTextType | null> {
  return unifyFetch<CommonTextType | null>({ apiKey: COMMON_TEXT_KEY });
}
