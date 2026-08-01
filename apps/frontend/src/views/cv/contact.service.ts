import { unifyFetch } from "@/api/fetcher";
import graphqlApi from "@/api/graphqlApi";
import { registerService } from "@/api/registry";

import { GET_CONTACT } from "./contact.queries";
import type { CvContactType } from "./contact.types";

export const CONTACT_KEY = "contact" as const;

async function _fetchContact(): Promise<CvContactType | null> {
  const data = await graphqlApi.fetch<CvContactType>({
    body: { query: GET_CONTACT },
    selectKey: "cvContact",
    mock: "cv-contact",
    next: { revalidate: 300, tags: ["cv"] },
  });
  return data ?? null;
}

registerService({ key: CONTACT_KEY, driver: "graphql", execute: _fetchContact });

export async function getContact(): Promise<CvContactType | null> {
  return unifyFetch<CvContactType | null>({ apiKey: CONTACT_KEY });
}
