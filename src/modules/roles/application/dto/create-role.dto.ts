import { ArrayUnique, IsArray, IsInt, IsNotEmpty, IsString, Matches, Max, MaxLength, Min } from "class-validator";

import { ApiProperty } from "@nestjs/swagger";

const ROLE_SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export class CreateRoleDto {
  @ApiProperty({ example: "Content Manager" })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiProperty({ example: "content-manager", description: "Lowercase, hyphen-separated, immutable after creation." })
  @IsString()
  @Matches(ROLE_SLUG_PATTERN, {
    message: "slug must be lowercase alphanumeric segments separated by single hyphens (e.g. content-manager)",
  })
  @MaxLength(63)
  slug!: string;

  @ApiProperty({ type: [String], example: ["document:read", "document:update"] })
  @IsArray()
  @IsString({ each: true })
  @ArrayUnique()
  permissions!: string[];

  @ApiProperty({ example: 50, minimum: 0, maximum: 100 })
  @IsInt()
  @Min(0)
  @Max(100)
  level!: number;
}
