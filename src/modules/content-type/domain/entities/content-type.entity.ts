import { ContentKind, FieldDefinition } from "./field-definition";

export interface ContentTypeDefinition {
  slug: string;
  name: string;
  kind: ContentKind;
  draftToPublish: boolean;
  fields: FieldDefinition[];
  listFields?: string[];
}

export interface ContentTypeSummary {
  slug: string;
  name: string;
  kind: ContentKind;
  draftToPublish: boolean;
}

export class ContentTypeEntity {
  constructor(
    public readonly documentId: string,
    public readonly slug: string,
    public readonly name: string,
    public readonly kind: ContentKind,
    public readonly draftToPublish: boolean,
    public readonly fields: FieldDefinition[],
    public readonly listFields: string[],
    public readonly createdAt: Date,
    public readonly updatedAt: Date,
  ) {}
}
