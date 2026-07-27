import { IsObject, IsOptional, IsString } from "class-validator";

import { ApiPropertyOptional } from "@nestjs/swagger";

import { type FilterQueryParams } from "@/modules/document/application/support/filter-query.parser";
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

  @ApiPropertyOptional({
    type: "object",
    additionalProperties: true,
    example: { title: { $contains: "engineer" }, age: { $gte: "18" } },
    description:
      "Per-field filters, keyed by field/system-column name: `filters[field][$op]=value`. One operator per field. " +
      "Supported operators by field type — text: `$eq` `$ne` `$contains`; number/timestamp system columns " +
      "(`created_at`/`updated_at`/`published_at`): `$eq` `$ne` `$gt` `$gte` `$lt` `$lte`; boolean/`id`/`document_id`: " +
      '`$eq` `$ne`. Boolean values must be the literal string `"true"`/`"false"`. Fields not in the sortable ' +
      "allowlist (richtext/media/json/component) are not filterable. Combines with `search` and with every other " +
      "filtered field as an AND.",
  })
  @IsOptional()
  @IsObject()
  filters?: FilterQueryParams;
}
