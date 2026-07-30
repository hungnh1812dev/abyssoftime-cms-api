import { ContentTypeEntity } from "../../../content-type/domain/entities/content-type.entity";
import { ContentKind } from "../../../content-type/domain/entities/field-definition";
import { DocumentVersion } from "../../domain/entities/document.entity";

import { BadRequestException } from "@nestjs/common";

export function resolveSaveVersion(contentType: ContentTypeEntity): DocumentVersion {
  return contentType.draftToPublish ? "draft" : "published";
}

export function assertDraftPublishEnabled(contentType: ContentTypeEntity): void {
  if (!contentType.draftToPublish) {
    throw new BadRequestException(`Content type "${contentType.slug}" does not use draft/publish; changes are live on save`);
  }
}

export function assertKind(contentType: ContentTypeEntity, expectedKind: ContentKind): void {
  if (contentType.kind !== expectedKind) {
    throw new BadRequestException(`Content type "${contentType.slug}" is "${contentType.kind}", not "${expectedKind}" — use the ${contentType.kind}-type routes instead`);
  }
}
