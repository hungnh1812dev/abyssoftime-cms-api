import { ArrayUnique, IsArray, IsInt, IsNotEmpty, IsString, Matches, Max, MaxLength, Min } from "class-validator";

const ROLE_SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export class CreateRoleDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsString()
  @Matches(ROLE_SLUG_PATTERN, {
    message: "slug must be lowercase alphanumeric segments separated by single hyphens (e.g. content-manager)",
  })
  @MaxLength(63)
  slug!: string;

  @IsArray()
  @IsString({ each: true })
  @ArrayUnique()
  permissions!: string[];

  @IsInt()
  @Min(0)
  @Max(100)
  level!: number;
}
