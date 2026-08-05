import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

// Swagger response shapes only — the controller keeps returning the real DocumentResponse/
// ListDocumentsResult plain-object shapes at runtime (document-response.mapper.ts,
// list-documents.service.ts); those stay undecorated, so these mirror them for Swagger instead.
// Every property beyond the four below is a content-type field, spread directly alongside them
// (shape depends on the content type's own schema) — Swagger can't type an open index signature,
// so those extra fields won't show individually, only these fixed ones.
export class UpdatedByResponseDto {
  @ApiProperty()
  documentId!: string;

  @ApiProperty()
  name!: string;
}

export class DocumentDataResponseDto {
  @ApiProperty()
  documentId!: string;

  @ApiProperty({ enum: ["draft", "modified", "published"] })
  status!: "draft" | "modified" | "published";

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;

  @ApiPropertyOptional({ type: UpdatedByResponseDto, nullable: true })
  updatedBy?: UpdatedByResponseDto | null;
}

export class DocumentResponseDto {
  @ApiProperty({ type: DocumentDataResponseDto })
  data!: DocumentDataResponseDto;
}

export class PublishStatusResponseDto {
  @ApiProperty({ enum: ["draft", "published"] })
  status!: "draft" | "published";
}

export class ListedDocumentItemResponseDto {
  @ApiProperty({ description: "DB-generated autoincrement id — internal ordering key, not a stable public identifier (use documentId for that)." })
  id!: number;

  @ApiProperty()
  documentId!: string;

  @ApiProperty({ type: "object", additionalProperties: true, description: "Projected down to the content type's listFields only." })
  data!: Record<string, unknown>;

  @ApiProperty({ enum: ["draft", "modified", "published"] })
  status!: "draft" | "modified" | "published";

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;

  @ApiPropertyOptional({ type: UpdatedByResponseDto, nullable: true })
  updatedBy?: UpdatedByResponseDto | null;
}

export class ListDocumentsResponseDto {
  @ApiProperty({ type: [ListedDocumentItemResponseDto] })
  items!: ListedDocumentItemResponseDto[];

  @ApiProperty()
  total!: number;

  @ApiProperty()
  start!: number;

  @ApiProperty()
  size!: number;
}

export class BulkCreateResponseDto {
  @ApiProperty({ type: [DocumentResponseDto] })
  items!: DocumentResponseDto[];
}

export class BulkDeleteResponseDto {
  @ApiProperty({ type: [String], description: "IDs that were deleted. All-or-nothing: a failure rolls back the whole batch." })
  deleted!: string[];
}
