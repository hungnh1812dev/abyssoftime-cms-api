import { ApiProperty } from "@nestjs/swagger";

// Swagger response shape only — the controller still returns the real PermissionEntity at runtime;
// domain entities stay framework-agnostic (no @ApiProperty), so this mirrors its fields instead.
export class PermissionResponseDto {
  @ApiProperty()
  documentId!: string;

  @ApiProperty({ example: "document:read" })
  slug!: string;

  @ApiProperty({ example: "Read document" })
  name!: string;

  @ApiProperty({ example: "Allows reading a document", required: false })
  description?: string;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;

  @ApiProperty({ nullable: true })
  updatedBy!: string | null;
}
