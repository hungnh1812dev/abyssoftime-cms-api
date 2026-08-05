import get from "lodash/get";

import restfulApi from "./restfulApi";

export interface GraphQLError {
  message: string;
  locations?: { line: number; column: number }[];
  path?: string[];
  extensions?: Record<string, unknown>;
}

export interface GraphQLOptions {
  url?: string;
  body: unknown;
  headers?: Record<string, string>;
  selectKey?: string;
  mock?: string;
  next?: { revalidate?: number | false; tags?: string[] };
  cache?: RequestCache;
}

// Legacy options kept during migration — pages/views call query() until switched to services
export interface GraphQLQueryOptions {
  query: string;
  variables?: Record<string, unknown>;
  dataKey?: string;
  mock?: string;
  url?: string;
  next?: { revalidate?: number | false; tags?: string[] };
  cache?: RequestCache;
}

const DEFAULT_URL = process.env.GRAPHQL_URL ?? "http://localhost:5000/graphql";
const GRAPHQL_TOKEN = process.env.GRAPHQL_TOKEN;
const STRAPI_API_TOKEN = process.env.STRAPI_API_TOKEN;

// Primary method — used by services (portfolio interface)
const graphqlFetch = async <T>(options: GraphQLOptions): Promise<T> => {
  const { url = DEFAULT_URL, body, headers = {}, selectKey, mock, next, cache } = options;

  const authToken = GRAPHQL_TOKEN ?? STRAPI_API_TOKEN;
  const authHeaders: Record<string, string> = authToken ? { Authorization: `Bearer ${authToken}` } : {};

  const json: { data?: Record<string, unknown>; errors?: GraphQLError[] } = await restfulApi.fetch<typeof json>({
    url,
    method: "POST",
    body,
    headers: { ...authHeaders, ...headers },
    next,
    cache,
    mock,
  });

  if (json.data != null && !json.errors?.length) {
    const result = selectKey ? get(json.data, selectKey) : json.data;
    return result as T;
  }

  throw new Error(`GraphQL request failed for: ${url}`);
};

// Legacy method — kept until all pages/views switch to service functions
const graphqlQuery = async <T>(options: GraphQLQueryOptions): Promise<T> => {
  const { query, variables, mock, dataKey, url = DEFAULT_URL, next, cache } = options;
  return graphqlFetch<T>({
    url,
    body: { query, variables },
    selectKey: dataKey,
    mock,
    next,
    cache,
  });
};

const graphqlApi = { fetch: graphqlFetch, query: graphqlQuery };
export default graphqlApi;
