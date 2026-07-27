import { DocumentStatus } from "../../domain/entities/document.entity";
import { DOCUMENT_REPOSITORY, type IDocumentRepository } from "../../domain/repositories/document.repository";
import { resolveSaveVersion } from "../support/draft-publish.policy";
import { ListQueryParams, parseListQuery } from "../support/list-query.parser";
import { SchemaResolverService } from "../support/schema-resolver.service";
import { resolveBatchStatuses } from "../support/status-resolver";

import { Inject, Injectable } from "@nestjs/common";

export interface ListedDocumentItem {
  documentId: string;
  data: Record<string, unknown>;
  status: DocumentStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface ListDocumentsResult {
  items: ListedDocumentItem[];
  total: number;
  start: number;
  size: number;
}

@Injectable()
export class ListDocumentsService {
  constructor(
    private readonly schemaResolver: SchemaResolverService,
    @Inject(DOCUMENT_REPOSITORY) private readonly documents: IDocumentRepository,
  ) {}

  async execute(slug: string, query: ListQueryParams): Promise<ListDocumentsResult> {
    const contentType = await this.schemaResolver.resolve(slug);
    const options = parseListQuery(contentType, query);
    const version = resolveSaveVersion(contentType);

    const { rows, total } = await this.documents.listPaginated(slug, version, options, contentType.fields);

    const publishedRows = contentType.draftToPublish
      ? await this.documents.findManyByVersion(
          slug,
          rows.map((row) => row.documentId),
          "published",
          contentType.fields,
        )
      : [];
    const statuses = resolveBatchStatuses(contentType.draftToPublish, rows, publishedRows);

    const items: ListedDocumentItem[] = rows.map((row) => ({
      documentId: row.documentId,
      data: projectFields(row.fields, options.listFields),
      status: statuses.get(row.documentId) ?? "draft",
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    }));

    return { items, total, start: options.start, size: options.size };
  }
}

function projectFields(fields: Record<string, unknown>, listFields: string[]): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const name of listFields) {
    result[name] = fields[name] ?? null;
  }
  return result;
}
