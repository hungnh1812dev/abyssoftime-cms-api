import { IsNotEmpty, IsString, Matches } from "class-validator";

import { ApiProperty } from "@nestjs/swagger";

const PERMISSION_SLUG_PATTERN = /^[a-z][a-z0-9_]*:[a-z][a-z0-9_]*$/;

export class CreatePermissionDto {
  @ApiProperty({ example: "document:read", description: 'Format "resource:action", lowercase.' })
  @IsString()
  @Matches(PERMISSION_SLUG_PATTERN, {
    message: 'slug must be in the format "resource:action" (lowercase, e.g. document:read)',
  })
  slug!: string;

  @ApiProperty({ example: "Read document" })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiProperty({ example: "Allows reading a document" })
  @IsString()
  @IsNotEmpty()
  description!: string;
}
