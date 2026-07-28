import { ArrayNotEmpty, IsArray, IsString } from "class-validator";

import { ApiProperty } from "@nestjs/swagger";

export class UpdateListFieldsDto {
  @ApiProperty({ type: [String], example: ["title", "updatedAt"] })
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  listFields!: string[];
}
