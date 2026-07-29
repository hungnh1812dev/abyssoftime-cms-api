import { GraphQLFormattedError } from "graphql";

import { formatGraphqlError } from "./format-error.util";

function buildFormattedError(overrides: Partial<GraphQLFormattedError> = {}): GraphQLFormattedError {
  return { message: "boom", locations: [{ line: 1, column: 1 }], path: ["cvPage"], ...overrides };
}

describe("formatGraphqlError", () => {
  it.each(["UNAUTHENTICATED", "FORBIDDEN", "BAD_USER_INPUT", "NOT_FOUND", "GRAPHQL_PARSE_FAILED", "GRAPHQL_VALIDATION_FAILED"])(
    "passes a known-safe %s error through unchanged",
    (code) => {
      const formattedError = buildFormattedError({ extensions: { code } });

      expect(formatGraphqlError(formattedError)).toBe(formattedError);
    },
  );

  it("replaces an error with no extensions.code with a generic message, never leaking the original", () => {
    const formattedError = buildFormattedError({ message: 'relation "documents" does not exist' });

    const result = formatGraphqlError(formattedError);

    expect(result.message).toBe("Internal server error");
    expect(result.extensions?.code).toBe("INTERNAL_SERVER_ERROR");
    expect(JSON.stringify(result)).not.toContain("documents");
  });

  it("replaces an error with an unrecognized code with a generic message, preserving path/locations for client debugging", () => {
    const formattedError = buildFormattedError({ message: "Prisma: unique constraint violated on column email", extensions: { code: "SOME_INTERNAL_CODE" } });

    const result = formatGraphqlError(formattedError);

    expect(result.message).toBe("Internal server error");
    expect(result.extensions?.code).toBe("INTERNAL_SERVER_ERROR");
    expect(result.path).toEqual(["cvPage"]);
    expect(result.locations).toEqual([{ line: 1, column: 1 }]);
    expect(JSON.stringify(result)).not.toContain("Prisma");
  });
});
