import { IsObject } from "class-validator";

export class SaveDocumentDto {
  @IsObject()
  data!: Record<string, unknown>;
}
