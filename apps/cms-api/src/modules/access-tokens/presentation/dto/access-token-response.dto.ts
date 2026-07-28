import { ApiProperty } from "@nestjs/swagger";

export class AccessTokenResponseDto {
  @ApiProperty()
  documentId!: string;

  @ApiProperty({ example: "CI deploy token" })
  name!: string;

  @ApiProperty({ type: [String], example: ["media:read"] })
  permissions!: string[];

  @ApiProperty({ nullable: true, example: null })
  expiresAt!: Date | null;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;

  @ApiProperty({ nullable: true })
  updatedBy!: string | null;
}

// Returned only from create/revoke — the plaintext secret is shown exactly once and never again.
export class AccessTokenSecretResponseDto {
  @ApiProperty()
  documentId!: string;

  @ApiProperty({ example: "CI deploy token" })
  name!: string;

  @ApiProperty({ type: [String], example: ["media:read"] })
  permissions!: string[];

  @ApiProperty({ nullable: true, example: null })
  expiresAt!: Date | null;

  @ApiProperty({ example: "cms_2f8a...redacted", description: "Plaintext secret — shown only in this response, never retrievable again." })
  token!: string;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}
