import { GraphQLError } from "graphql";

import { isDocumentActionGranted } from "@/common/authorization/document-permission.util";

import { type GraphqlContext } from "./graphql-context.factory";

export function assertApiTokenPermission(context: GraphqlContext, slug: string, contentTypeSlug: string): void {
  if (!context.apiToken) {
    throw new GraphQLError("Authentication required", { extensions: { code: "UNAUTHENTICATED" } });
  }

  if (!isDocumentActionGranted(context.apiToken.permissions, slug, contentTypeSlug)) {
    throw new GraphQLError("Insufficient permissions", { extensions: { code: "FORBIDDEN" } });
  }
}
