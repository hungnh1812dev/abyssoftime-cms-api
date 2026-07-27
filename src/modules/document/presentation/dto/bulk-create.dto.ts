import { Type } from "class-transformer";
import { ArrayMaxSize, ArrayMinSize, ValidateNested } from "class-validator";

import { SaveDocumentDto } from "./save-document.dto";

export class BulkCreateDto {
  @ArrayMinSize(1)
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => SaveDocumentDto)
  items!: SaveDocumentDto[];
}
