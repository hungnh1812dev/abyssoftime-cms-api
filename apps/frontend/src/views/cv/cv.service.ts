import { unifyFetch } from "@/api/fetcher";
import graphqlApi from "@/api/graphqlApi";
import { registerService } from "@/api/registry";

import { GET_CV_BY_DOCUMENT_ID, GET_CV_LIST, GET_MAIN_CV } from "./cv.queries";
import type { CvCollectionItemType, CvListItemType } from "./cv.types";

export const CV_MAIN_KEY = "cv.main" as const;
export const CV_LIST_KEY = "cv.list" as const;
export const CV_BY_ID_KEY = "cv.by-id" as const;

async function _fetchMainCv(): Promise<CvCollectionItemType | null> {
  const pages = await graphqlApi.fetch<CvCollectionItemType[]>({
    body: { query: GET_MAIN_CV },
    selectKey: "cvPages",
    mock: "cv-main",
    next: { revalidate: 600, tags: ["cv"] },
  });
  return pages?.[0] ?? null;
}

async function _fetchCvList(): Promise<CvListItemType[]> {
  return graphqlApi.fetch<CvListItemType[]>({
    body: { query: GET_CV_LIST },
    selectKey: "cvPages",
    mock: "cv-list",
    next: { revalidate: 600, tags: ["cv"] },
  });
}

async function _fetchCvById(params?: unknown): Promise<CvCollectionItemType | null> {
  const { documentId } = (params ?? {}) as { documentId: string };
  const data = await graphqlApi.fetch<CvCollectionItemType>({
    body: { query: GET_CV_BY_DOCUMENT_ID, variables: { documentId } },
    selectKey: "cvPage",
    mock: `cv-${documentId}`,
    next: { revalidate: 600, tags: ["cv"] },
  });
  return data ?? null;
}

registerService({ key: CV_MAIN_KEY, driver: "graphql", execute: _fetchMainCv });
registerService({ key: CV_LIST_KEY, driver: "graphql", execute: _fetchCvList });
registerService({ key: CV_BY_ID_KEY, driver: "graphql", execute: _fetchCvById });

export async function getMainCv(): Promise<CvCollectionItemType | null> {
  return unifyFetch<CvCollectionItemType | null>({ apiKey: CV_MAIN_KEY });
}

export async function getCvList(): Promise<CvListItemType[]> {
  return unifyFetch<CvListItemType[]>({ apiKey: CV_LIST_KEY });
}

export async function getCvById(documentId: string): Promise<CvCollectionItemType | null> {
  return unifyFetch<CvCollectionItemType | null>({ apiKey: CV_BY_ID_KEY, params: { documentId } });
}
