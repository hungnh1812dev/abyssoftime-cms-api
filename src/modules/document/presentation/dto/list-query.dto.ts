import { IsOptional, IsString } from "class-validator";

import { ApiPropertyOptional } from "@nestjs/swagger";

import { type ListQueryParams } from "@/modules/document/application/support/list-query.parser";

export class ListQueryDto implements ListQueryParams {
  @ApiPropertyOptional({ example: "0", default: "0", description: "Non-negative integer, as a string." })
  @IsOptional()
  @IsString()
  start?: string;

  @ApiPropertyOptional({ example: "20", default: "20", description: "Integer 1-100, as a string." })
  @IsOptional()
  @IsString()
  size?: string;

  @ApiPropertyOptional({ example: "id", default: "id", description: "Must be a system column or a text/number/boolean field on the content type; validated against an allowlist." })
  @IsOptional()
  @IsString()
  orderBy?: string;

  @ApiPropertyOptional({ enum: ["asc", "desc"], default: "desc" })
  @IsOptional()
  @IsString()
  sortDir?: string;

  @ApiPropertyOptional({ description: "Case-insensitive substring match, OR'd across the content type's text/richtext list fields." })
  @IsOptional()
  @IsString()
  search?: string;
}
