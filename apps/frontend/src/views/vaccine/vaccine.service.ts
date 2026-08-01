import { unifyFetch } from "@/api/fetcher";
import graphqlApi from "@/api/graphqlApi";
import { registerService } from "@/api/registry";

import { VACCINE_PAGE_QUERY } from "./vaccine.queries";
import type { VaccinePageData } from "./vaccine.types";

export const VACCINE_KEY = "vaccine" as const;

async function _fetchVaccinePage(): Promise<VaccinePageData | null> {
  const data = await graphqlApi.fetch<VaccinePageData>({
    body: { query: VACCINE_PAGE_QUERY },
    selectKey: "vaccinePage",
    mock: "vaccine-page",
  });
  return data ?? null;
}

registerService({ key: VACCINE_KEY, driver: "graphql", execute: _fetchVaccinePage });

export async function getVaccinePage(): Promise<VaccinePageData | null> {
  return unifyFetch<VaccinePageData | null>({ apiKey: VACCINE_KEY });
}
