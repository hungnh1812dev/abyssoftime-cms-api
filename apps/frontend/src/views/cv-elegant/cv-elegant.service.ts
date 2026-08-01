import { unifyFetch } from "@/api/fetcher";
import graphqlApi from "@/api/graphqlApi";
import { registerService } from "@/api/registry";

import { GET_CV_ELEGANT_BY_DOCUMENT_ID, GET_CV_ELEGANT_LIST, GET_MAIN_CV_ELEGANT } from "./cv-elegant.queries";
import type { CvElegantListItemType, CvElegantPageDataType } from "./cv-elegant.types";

export const CV_ELEGANT_MAIN_KEY = "cv-elegant.main" as const;
export const CV_ELEGANT_LIST_KEY = "cv-elegant.list" as const;
export const CV_ELEGANT_BY_ID_KEY = "cv-elegant.by-id" as const;

async function _fetchMainCvElegant(): Promise<CvElegantPageDataType | null> {
  const pages = await graphqlApi.fetch<CvElegantPageDataType[]>({
    body: { query: GET_MAIN_CV_ELEGANT },
    selectKey: "cvPages.items",
    mock: "cv-elegant-main",
    next: { revalidate: 300, tags: ["cv"] },
  });
  return pages?.[0] ?? null;
}

async function _fetchCvElegantList(): Promise<CvElegantListItemType[]> {
  return graphqlApi.fetch<CvElegantListItemType[]>({
    body: { query: GET_CV_ELEGANT_LIST },
    selectKey: "cvPages.items",
    mock: "cv-elegant-list",
    next: { revalidate: 300, tags: ["cv"] },
  });
}

async function _fetchCvElegantById(params?: unknown): Promise<CvElegantPageDataType | null> {
  const { documentId } = (params ?? {}) as { documentId: string };
  const data = await graphqlApi.fetch<CvElegantPageDataType>({
    body: { query: GET_CV_ELEGANT_BY_DOCUMENT_ID, variables: { documentId } },
    selectKey: "cvPage",
    mock: `cv-elegant-${documentId}`,
    next: { revalidate: 300, tags: ["cv"] },
  });
  return data ?? null;
}

registerService({ key: CV_ELEGANT_MAIN_KEY, driver: "graphql", execute: _fetchMainCvElegant });
registerService({ key: CV_ELEGANT_LIST_KEY, driver: "graphql", execute: _fetchCvElegantList });
registerService({ key: CV_ELEGANT_BY_ID_KEY, driver: "graphql", execute: _fetchCvElegantById });

export async function getMainCvElegant(): Promise<CvElegantPageDataType | null> {
  return unifyFetch<CvElegantPageDataType | null>({ apiKey: CV_ELEGANT_MAIN_KEY });
}

export async function getCvElegantList(): Promise<CvElegantListItemType[]> {
  return unifyFetch<CvElegantListItemType[]>({ apiKey: CV_ELEGANT_LIST_KEY });
}

export async function getCvElegantById(documentId: string): Promise<CvElegantPageDataType | null> {
  return unifyFetch<CvElegantPageDataType | null>({ apiKey: CV_ELEGANT_BY_ID_KEY, params: { documentId } });
}
