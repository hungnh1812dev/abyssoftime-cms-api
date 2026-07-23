import { IsNotEmpty, IsString, Matches } from "class-validator";

const PERMISSION_SLUG_PATTERN = /^[a-z][a-z0-9_]*:[a-z][a-z0-9_]*$/;

export class CreatePermissionDto {
  @IsString()
  @Matches(PERMISSION_SLUG_PATTERN, {
    message: 'slug must be in the format "resource:action" (lowercase, e.g. document:read)',
  })
  slug!: string;

  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsString()
  @IsNotEmpty()
  description!: string;
}
