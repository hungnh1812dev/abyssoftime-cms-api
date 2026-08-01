import graphqlApi, { type GraphQLOptions } from "./graphqlApi";
import { lookupService, type ServiceDriver } from "./registry";
import restfulApi, { type RestOptions } from "./restfulApi";

export interface FetcherOptions {
  driver?: "graphql" | "rest";
  url?: string;
  body?: unknown;
  headers?: Record<string, string>;
  selectKey?: string;
  mock?: string;
  method?: "GET" | "POST" | "PUT" | "DELETE";
  next?: { revalidate?: number | false; tags?: string[] };
  cache?: RequestCache;
}

const fetcher = async <T>(options: FetcherOptions): Promise<T> => {
  const { driver = "graphql", ...rest } = options;

  if (driver === "rest") return restfulApi.fetch<T>(rest as RestOptions);
  return graphqlApi.fetch<T>(rest as GraphQLOptions);
};

export default fetcher;

export interface UnifyFetchOptions {
  apiKey: string;
  driver?: ServiceDriver;
  params?: Record<string, unknown>;
}

export async function unifyFetch<T>(opts: UnifyFetchOptions): Promise<T> {
  const driver: ServiceDriver = opts.driver ?? "graphql";
  const service = lookupService(opts.apiKey, driver);
  return service.execute(opts.params) as Promise<T>;
}
