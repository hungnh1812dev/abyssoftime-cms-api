import { ContentTypeEntity } from "../../domain/entities/content-type.entity";
import { CONTENT_TYPE_REPOSITORY, ContentTypeNotFoundError, type IContentTypeRepository } from "../../domain/repositories/content-type.repository";

import { Inject, Injectable, NotFoundException } from "@nestjs/common";

@Injectable()
export class GetContentTypeService {
  constructor(@Inject(CONTENT_TYPE_REPOSITORY) private readonly contentTypes: IContentTypeRepository) {}

  async execute(slug: string): Promise<ContentTypeEntity> {
    const contentType = await this.contentTypes.findBySlug(slug);
    if (!contentType) {
      throw new NotFoundException(new ContentTypeNotFoundError(slug).message);
    }
    return contentType;
  }
}
