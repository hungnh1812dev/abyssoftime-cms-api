import { GetContentTypeService } from "../../../content-type/application/services/get-content-type.service";
import { ContentTypeEntity } from "../../../content-type/domain/entities/content-type.entity";

import { Injectable } from "@nestjs/common";

@Injectable()
export class SchemaResolverService {
  constructor(private readonly getContentType: GetContentTypeService) {}

  async resolve(slug: string): Promise<ContentTypeEntity> {
    return this.getContentType.execute(slug);
  }
}
