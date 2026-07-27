import { IsObject } from "class-validator";

import { ApiProperty } from "@nestjs/swagger";

export class SaveDocumentDto {
  @ApiProperty({
    type: "object",
    additionalProperties: true,
    example: { title: "Hello world" },
    description: "Shape depends entirely on the target content type's own field schema (see GET /api/content-types/:slug) — validated at the SQL layer, not by this DTO.",
  })
  @IsObject()
  data!: Record<string, unknown>;
}
