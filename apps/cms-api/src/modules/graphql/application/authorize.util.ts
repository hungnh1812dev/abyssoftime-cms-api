import { GraphQLError } from "graphql";

import { type GraphqlContext } from "./graphql-context.factory";

export function assertApiTokenPermission(context: GraphqlContext, slug: string): void {
  if (!context.apiToken) {
    throw new GraphQLError("Authentication required", { extensions: { code: "UNAUTHENTICATED" } });
  }

  if (!context.apiToken.permissions.includes(slug)) {
    throw new GraphQLError("Insufficient permissions", { extensions: { code: "FORBIDDEN" } });
  }
}
