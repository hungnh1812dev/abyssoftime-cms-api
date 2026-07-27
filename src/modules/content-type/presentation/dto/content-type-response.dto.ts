import { type FieldType } from "../../domain/entities/field-definition";

import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

// Swagger response shapes only — the controller still returns the real domain
// entity/interfaces at runtime; those stay framework-agnostic (no @ApiProperty).
export class FieldDefinitionResponseDto {
  @ApiProperty({ example: "title" })
  name!: string;

  @ApiProperty({ enum: ["text", "richtext", "number", "boolean", "media", "json", "component"], example: "text" })
  type!: FieldType;

  @ApiPropertyOptional()
  width?: string;

  @ApiPropertyOptional()
  header?: boolean;

  @ApiPropertyOptional({ description: 'Present iff type === "component" — the name of the component it references.' })
  component?: string;

  @ApiPropertyOptional({ description: 'Present iff type === "component".' })
  repeatable?: boolean;

  @ApiPropertyOptional({ type: () => FieldDefinitionResponseDto, isArray: true, description: 'Present iff type === "component" — the nested field list for that component.' })
  fields?: FieldDefinitionResponseDto[];
}

export class ContentTypeSummaryResponseDto {
  @ApiProperty({ example: "cv-page" })
  slug!: string;

  @ApiProperty({ example: "CV Page" })
  name!: string;

  @ApiProperty({ enum: ["single", "collection"] })
  kind!: "single" | "collection";

  @ApiProperty()
  draftToPublish!: boolean;
}

export class ContentTypeResponseDto extends ContentTypeSummaryResponseDto {
  @ApiProperty()
  documentId!: string;

  @ApiProperty({ type: [FieldDefinitionResponseDto] })
  fields!: FieldDefinitionResponseDto[];

  @ApiProperty({ type: [String], example: ["title", "slug", "updatedAt"] })
  listFields!: string[];

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}
