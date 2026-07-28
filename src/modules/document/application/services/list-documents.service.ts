import { DocumentStatus } from "../../domain/entities/document.entity";
import { DOCUMENT_REPOSITORY, type IDocumentRepository } from "../../domain/repositories/document.repository";
import { assertKind, resolveSaveVersion } from "../support/draft-publish.policy";
import { ListQueryParams, parseListQuery } from "../support/list-query.parser";
import { SchemaResolverService } from "../support/schema-resolver.service";
import { resolveBatchStatuses } from "../support/status-resolver";

import { Inject, Injectable } from "@nestjs/common";

import { type IUserRepository, USER_REPOSITORY } from "@/modules/users/domain/repositories/user.repository";

export interface ResolvedUpdatedBy {
  documentId: string;
  name: string;
}

export interface ListedDocumentItem {
  documentId: string;
  data: Record<string, unknown>;
  status: DocumentStatus;
  createdAt: Date;
  updatedAt: Date;
  updatedBy: ResolvedUpdatedBy | null;
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
    @Inject(USER_REPOSITORY) private readonly users: IUserRepository,
  ) {}

  async execute(slug: string, query: ListQueryParams): Promise<ListDocumentsResult> {
    const contentType = await this.schemaResolver.resolve(slug);
    assertKind(contentType, "collection");
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

    const updatedByIds = [...new Set(rows.map((row) => row.updatedBy).filter((id): id is string => id !== null))];
    const updatedByUsers = await this.users.findByIds(updatedByIds);
    const updatedByMap = new Map(updatedByUsers.map((user) => [user.documentId, { documentId: user.documentId, name: user.name }]));

    const items: ListedDocumentItem[] = rows.map((row) => ({
      documentId: row.documentId,
      data: projectFields(row.fields, options.listFields),
      status: statuses.get(row.documentId) ?? "draft",
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      updatedBy: row.updatedBy ? (updatedByMap.get(row.updatedBy) ?? null) : null,
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
