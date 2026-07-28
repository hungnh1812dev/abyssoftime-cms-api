import { ArrayMaxSize, ArrayMinSize, IsArray, IsString } from "class-validator";

import { ApiProperty } from "@nestjs/swagger";

export class BulkDeleteDto {
  @ApiProperty({ type: [String], minItems: 1, maxItems: 100, example: ["3b4e2b1a-...", "9f0c7d2e-..."] })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(100)
  @IsString({ each: true })
  documentIds!: string[];
}
