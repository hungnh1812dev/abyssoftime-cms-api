import { IsOptional, IsString } from "class-validator";

import { type ListQueryParams } from "@/modules/document/application/support/list-query.parser";

export class ListQueryDto implements ListQueryParams {
  @IsOptional()
  @IsString()
  start?: string;

  @IsOptional()
  @IsString()
  size?: string;

  @IsOptional()
  @IsString()
  orderBy?: string;

  @IsOptional()
  @IsString()
  sortDir?: string;

  @IsOptional()
  @IsString()
  search?: string;
}
