import { ApiProperty } from "@nestjs/swagger";

// Swagger response shape only — the controller still returns the real MediaAssetEntity at runtime;
// domain entities stay framework-agnostic (no @ApiProperty), so this mirrors its fields instead.
export class MediaAssetResponseDto {
  @ApiProperty()
  documentId!: string;

  @ApiProperty({ example: "cover.png" })
  fileName!: string;

  @ApiProperty({ example: "image/png", description: "Detected from the actual file bytes, not trusted from the upload's declared type." })
  mimeType!: string;

  @ApiProperty({ example: 204800 })
  size!: number;

  @ApiProperty({ example: 1200 })
  width!: number;

  @ApiProperty({ example: 630 })
  height!: number;

  @ApiProperty({ example: "https://res.cloudinary.com/.../cover.png" })
  url!: string;

  @ApiProperty({ example: "https://res.cloudinary.com/.../cover_thumb.png" })
  thumbnailUrl!: string;

  @ApiProperty()
  publicId!: string;

  @ApiProperty({ description: "SHA-256 of the uploaded bytes." })
  hash!: string;

  @ApiProperty({ nullable: true })
  uploadedBy!: string | null;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}
