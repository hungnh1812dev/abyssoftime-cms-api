import { ArrayUnique, IsArray, IsInt, IsNotEmpty, IsOptional, IsString, Max, Min } from "class-validator";

import { ApiPropertyOptional } from "@nestjs/swagger";

export class UpdateRoleDto {
  @ApiPropertyOptional({ example: "Content Manager" })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  name?: string;

  @ApiPropertyOptional({ type: [String], example: ["document:read", "document:update"] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @ArrayUnique()
  permissions?: string[];

  @ApiPropertyOptional({ example: 50, minimum: 0, maximum: 100 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  level?: number;
}
