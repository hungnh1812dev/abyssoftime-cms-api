import { IsNotEmpty, IsOptional, IsString } from "class-validator";

import { ApiPropertyOptional } from "@nestjs/swagger";

export class UpdatePermissionDto {
  @ApiPropertyOptional({ example: "Read document" })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  name?: string;

  @ApiPropertyOptional({ example: "Allows reading a document" })
  @IsOptional()
  @IsString()
  description?: string;
}
