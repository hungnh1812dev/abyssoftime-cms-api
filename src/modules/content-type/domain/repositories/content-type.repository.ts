import { ContentTypeEntity, ContentTypeSummary } from "../entities/content-type.entity";
import { ContentKind, FieldDefinition } from "../entities/field-definition";

export interface UpsertContentTypeData {
  slug: string;
  name: string;
  kind: ContentKind;
  draftToPublish: boolean;
  fields: FieldDefinition[];
  listFields: string[];
}

export interface IContentTypeRepository {
  create(data: UpsertContentTypeData): Promise<ContentTypeEntity>;
  update(slug: string, data: UpsertContentTypeData): Promise<ContentTypeEntity>;
  delete(slug: string): Promise<void>;
  findBySlug(slug: string): Promise<ContentTypeEntity | null>;
  findAll(): Promise<ContentTypeEntity[]>;
  findAllSummaries(): Promise<ContentTypeSummary[]>;
}

export const CONTENT_TYPE_REPOSITORY = Symbol("CONTENT_TYPE_REPOSITORY");

export class ContentTypeNotFoundError extends Error {
  constructor(slug: string) {
    super(`Content type "${slug}" not found`);
    this.name = "ContentTypeNotFoundError";
  }
}
