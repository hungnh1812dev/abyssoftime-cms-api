import { GraphQLError } from "graphql";

import { assertApiTokenPermission } from "./authorize.util";
import { type GraphqlContext } from "./graphql-context.factory";

describe("assertApiTokenPermission", () => {
  it("throws UNAUTHENTICATED when the context has no token", () => {
    const context: GraphqlContext = { apiToken: null };

    expect(() => assertApiTokenPermission(context, "document:read")).toThrow(GraphQLError);
    try {
      assertApiTokenPermission(context, "document:read");
      fail("expected assertApiTokenPermission to throw");
    } catch (error) {
      expect((error as GraphQLError).extensions?.code).toBe("UNAUTHENTICATED");
    }
  });

  it("throws FORBIDDEN when the token is missing the required permission slug", () => {
    const context: GraphqlContext = { apiToken: { documentId: "token-1", name: "CI", permissions: ["document:read"] } };

    try {
      assertApiTokenPermission(context, "document:publish");
      fail("expected assertApiTokenPermission to throw");
    } catch (error) {
      expect(error).toBeInstanceOf(GraphQLError);
      expect((error as GraphQLError).extensions?.code).toBe("FORBIDDEN");
    }
  });

  it("passes silently when the token has the required permission slug", () => {
    const context: GraphqlContext = { apiToken: { documentId: "token-1", name: "CI", permissions: ["document:read"] } };

    expect(() => assertApiTokenPermission(context, "document:read")).not.toThrow();
  });
});
