import { GraphQLFormattedError } from "graphql";

// Our own resolver-facing codes (authorize.util.ts, resolver-factory.service.ts,
// list-args.translator.ts) plus graphql-js/Apollo's own request-level codes (malformed query,
// introspection disabled, ...) — all of these are safe to show a client verbatim since they never
// carry internal implementation details. Anything else (a bare Error, a Prisma/driver exception
// that slipped past resolver-factory.service.ts's mapping) gets replaced below instead of leaking
// its raw `.message` to an untrusted caller.
const SAFE_ERROR_CODES = new Set([
  "UNAUTHENTICATED",
  "FORBIDDEN",
  "BAD_USER_INPUT",
  "NOT_FOUND",
  "GRAPHQL_PARSE_FAILED",
  "GRAPHQL_VALIDATION_FAILED",
  "PERSISTED_QUERY_NOT_FOUND",
  "PERSISTED_QUERY_NOT_SUPPORTED",
  "OPERATION_RESOLUTION_FAILURE",
  "BAD_REQUEST",
  "INTROSPECTION_DISABLED",
  "MAX_RECURSIVE_SELECTIONS_EXCEEDED",
]);

export function formatGraphqlError(formattedError: GraphQLFormattedError): GraphQLFormattedError {
  const code = formattedError.extensions?.code;
  if (typeof code === "string" && SAFE_ERROR_CODES.has(code)) {
    return formattedError;
  }

  return {
    message: "Internal server error",
    locations: formattedError.locations,
    path: formattedError.path,
    extensions: { code: "INTERNAL_SERVER_ERROR" },
  };
}
