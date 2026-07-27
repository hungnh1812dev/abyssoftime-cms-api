import { assertSafeSlug, UnsafeSqlIdentifierError } from "../../content-type/application/schema/sql-identifier";
import { isUUID } from "class-validator";

import { BadRequestException } from "@nestjs/common";

export function validateSlugParam(slug: string): void {
  try {
    assertSafeSlug(slug);
  } catch (error) {
    if (error instanceof UnsafeSqlIdentifierError) {
      throw new BadRequestException(error.message);
    }
    throw error;
  }
}

export function validateDocumentIdParam(documentId: string): void {
  if (!isUUID(documentId, "4")) {
    throw new BadRequestException(`Invalid documentId: "${documentId}" (must be a UUID v4)`);
  }
}
