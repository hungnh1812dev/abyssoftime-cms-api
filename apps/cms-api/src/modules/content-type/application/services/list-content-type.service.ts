import { ContentTypeSummary } from "../../domain/entities/content-type.entity";
import { CONTENT_TYPE_REPOSITORY, type IContentTypeRepository } from "../../domain/repositories/content-type.repository";

import { Inject, Injectable } from "@nestjs/common";

@Injectable()
export class ListContentTypeService {
  constructor(@Inject(CONTENT_TYPE_REPOSITORY) private readonly contentTypes: IContentTypeRepository) {}

  execute(): Promise<ContentTypeSummary[]> {
    return this.contentTypes.findAllSummaries();
  }
}
