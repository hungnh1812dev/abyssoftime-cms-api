export const locales = ["en", "vi"] as readonly string[];
export const defaultLocale = "en";

// Root app api url, used for both REST and GraphQL endpoints
export const APP_API_URL = process.env.APP_API_URL ?? "http://localhost:8080";
export const APP_API_GLOBAL_TOKEN = process.env.APP_API_TOKEN ?? "";

// Api api url
export const CMS_API_URL = `${APP_API_URL}/api/v1`;
// CMS graphql api url
export const CMS_GRAPHQL_API_URL = `${APP_API_URL}/graphql`;

export const APP_REVALIDATE_TOKEN = process.env.APP_REVALIDATE_TOKEN ?? "";
