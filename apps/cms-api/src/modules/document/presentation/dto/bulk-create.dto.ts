import { Type } from "class-transformer";
import { ArrayMaxSize, ArrayMinSize, ValidateNested } from "class-validator";

import { ApiProperty } from "@nestjs/swagger";

import { SaveDocumentDto } from "./save-document.dto";

export class BulkCreateDto {
  @ApiProperty({ type: [SaveDocumentDto], minItems: 1, maxItems: 100 })
  @ArrayMinSize(1)
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => SaveDocumentDto)
  items!: SaveDocumentDto[];
}
