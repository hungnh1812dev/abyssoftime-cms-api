import { ApiProperty } from "@nestjs/swagger";

// Swagger response shape only — the controller still returns the real RoleEntity at runtime;
// domain entities stay framework-agnostic (no @ApiProperty), so this mirrors its fields instead.
export class RoleResponseDto {
  @ApiProperty()
  documentId!: string;

  @ApiProperty({ example: "Content Manager" })
  name!: string;

  @ApiProperty({ example: "content-manager" })
  slug!: string;

  @ApiProperty({ type: [String], example: ["document:read", "document:update"] })
  permissions!: string[];

  @ApiProperty({ example: 50 })
  level!: number;

  @ApiProperty()
  isDefault!: boolean;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;

  @ApiProperty({ nullable: true })
  updatedBy!: string | null;
}
