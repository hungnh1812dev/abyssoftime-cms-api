import { unifyFetch } from "@/api/fetcher";
import graphqlApi from "@/api/graphqlApi";
import { registerService } from "@/api/registry";

import { HOME_PAGE_QUERY } from "./home.queries";
import type { HomePageData } from "./home.types";

export const HOME_KEY = "home" as const;

async function _fetchHomePage(): Promise<HomePageData | null> {
  const data = await graphqlApi.fetch<HomePageData>({
    body: { query: HOME_PAGE_QUERY },
    selectKey: "homePage",
    mock: "home-page",
  });
  return data ?? null;
}

registerService({ key: HOME_KEY, driver: "graphql", execute: _fetchHomePage });

export async function getHomePage(): Promise<HomePageData | null> {
  return unifyFetch<HomePageData | null>({ apiKey: HOME_KEY });
}
