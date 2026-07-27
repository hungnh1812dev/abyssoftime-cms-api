import { ContentTypeEntity } from "../../../content-type/domain/entities/content-type.entity";
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
