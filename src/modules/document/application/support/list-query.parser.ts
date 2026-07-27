import { ContentTypeEntity } from "../../../content-type/domain/entities/content-type.entity";
import { ListOptions } from "../../domain/repositories/document.repository";

import { BadRequestException } from "@nestjs/common";

import { sortableColumnsFor } from "@/modules/document/infrastructure/persistence/sql/where-builder";

const DEFAULT_START = 0;
const DEFAULT_SIZE = 20;
const MAX_SIZE = 100;
const DEFAULT_ORDER_BY = "id";
const DEFAULT_SORT_DIR = "desc";
const SEARCHABLE_FIELD_TYPES = new Set(["text", "richtext"]);

export interface ListQueryParams {
  start?: string;
  size?: string;
  orderBy?: string;
  sortDir?: string;
  search?: string;
}

export function parseListQuery(contentType: ContentTypeEntity, query: ListQueryParams): ListOptions {
  return {
    start: parseStart(query.start),
    size: parseSize(query.size),
    orderBy: parseOrderBy(query.orderBy, contentType),
    sortDir: parseSortDir(query.sortDir),
    search: query.search,
    listFields: contentType.listFields,
    searchableFields: searchableFieldsFor(contentType),
  };
}

function parseStart(raw: string | undefined): number {
  if (raw === undefined) {
    return DEFAULT_START;
  }
  const value = Number(raw);
  if (!Number.isInteger(value) || value < 0) {
    throw new BadRequestException(`Invalid "start" query param: "${raw}"`);
  }
  return value;
}

function parseSize(raw: string | undefined): number {
  if (raw === undefined) {
    return DEFAULT_SIZE;
  }
  const value = Number(raw);
  if (!Number.isInteger(value) || value < 1 || value > MAX_SIZE) {
    throw new BadRequestException(`Invalid "size" query param: "${raw}" (must be between 1 and ${MAX_SIZE})`);
  }
  return value;
}

function parseOrderBy(raw: string | undefined, contentType: ContentTypeEntity): string {
  const orderBy = raw ?? DEFAULT_ORDER_BY;
  if (!sortableColumnsFor(contentType.fields).includes(orderBy)) {
    throw new BadRequestException(`Invalid "orderBy" query param: "${orderBy}"`);
  }
  return orderBy;
}

function parseSortDir(raw: string | undefined): "asc" | "desc" {
  if (raw === undefined) {
    return DEFAULT_SORT_DIR;
  }
  if (raw !== "asc" && raw !== "desc") {
    throw new BadRequestException(`Invalid "sortDir" query param: "${raw}" (must be "asc" or "desc")`);
  }
  return raw;
}

function searchableFieldsFor(contentType: ContentTypeEntity): string[] {
  const fieldTypeByName = new Map(contentType.fields.map((field) => [field.name, field.type]));
  return contentType.listFields.filter((name) => {
    const type = fieldTypeByName.get(name);
    return type !== undefined && SEARCHABLE_FIELD_TYPES.has(type);
  });
}
