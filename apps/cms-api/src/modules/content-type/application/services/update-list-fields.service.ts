import { ContentTypeEntity } from "../../domain/entities/content-type.entity";
import { FieldDefinition, LISTABLE_FIELD_TYPES, LISTABLE_SYSTEM_COLUMNS } from "../../domain/entities/field-definition";
import { CONTENT_TYPE_REPOSITORY, ContentTypeNotFoundError, type IContentTypeRepository } from "../../domain/repositories/content-type.repository";

import { BadRequestException, Inject, Injectable, NotFoundException } from "@nestjs/common";

function isListable(name: string, fields: FieldDefinition[]): boolean {
  if (LISTABLE_SYSTEM_COLUMNS.includes(name)) {
    return true;
  }
  const field = fields.find((candidate) => candidate.name === name);
  return field !== undefined && LISTABLE_FIELD_TYPES.has(field.type);
}

@Injectable()
export class UpdateListFieldsService {
  constructor(@Inject(CONTENT_TYPE_REPOSITORY) private readonly contentTypes: IContentTypeRepository) {}

  async execute(slug: string, listFields: string[]): Promise<ContentTypeEntity> {
    const contentType = await this.contentTypes.findBySlug(slug);
    if (!contentType) {
      throw new NotFoundException(new ContentTypeNotFoundError(slug).message);
    }

    for (const name of listFields) {
      if (!isListable(name, contentType.fields)) {
        throw new BadRequestException(`"${name}" is not a listable field or system column`);
      }
    }

    return this.contentTypes.updateListFields(slug, listFields);
  }
}
