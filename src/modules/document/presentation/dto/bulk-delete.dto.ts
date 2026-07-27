import { ArrayMaxSize, ArrayMinSize, IsArray, IsString } from "class-validator";

export class BulkDeleteDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(100)
  @IsString({ each: true })
  documentIds!: string[];
}
