import { DocumentEntity, DocumentStatus } from "../../domain/entities/document.entity";
import { DOCUMENT_REPOSITORY, type IDocumentRepository } from "../../domain/repositories/document.repository";
import { assertKind, resolveSaveVersion } from "../support/draft-publish.policy";
import { ListQueryParams, parseListQuery } from "../support/list-query.parser";
import { SchemaResolverService } from "../support/schema-resolver.service";
import { resolveBatchStatuses } from "../support/status-resolver";

import { Inject, Injectable } from "@nestjs/common";

import { LISTABLE_SYSTEM_COLUMNS } from "@/modules/content-type/domain/entities/field-definition";
import { type IUserRepository, USER_REPOSITORY } from "@/modules/users/domain/repositories/user.repository";

export interface ResolvedUpdatedBy {
  documentId: string;
  name: string;
}

export interface ListedDocumentItem {
  id: number;
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

    const items: ListedDocumentItem[] = rows.map((row) => {
      const status = statuses.get(row.documentId) ?? "draft";
      const updatedBy = row.updatedBy ? (updatedByMap.get(row.updatedBy) ?? null) : null;
      return {
        // Rows come from listPaginated, which always maps through
        // row-mapper.ts and so always sets id — unlike an in-memory entity
        // built before its first insert.
        id: row.id as number,
        documentId: row.documentId,
        data: projectFields(row, status, updatedBy, options.listFields),
        status,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
        updatedBy,
      };
    });

    return { items, total, start: options.start, size: options.size };
  }
}

function projectFields(row: DocumentEntity, status: DocumentStatus, updatedBy: ResolvedUpdatedBy | null, listFields: string[]): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const name of listFields) {
    result[name] = LISTABLE_SYSTEM_COLUMNS.includes(name) ? systemColumnValue(name, row, status, updatedBy) : (row.fields[name] ?? null);
  }
  return result;
}

function systemColumnValue(name: string, row: DocumentEntity, status: DocumentStatus, updatedBy: ResolvedUpdatedBy | null): unknown {
  switch (name) {
    case "id":
      return row.id;
    case "documentId":
      return row.documentId;
    case "status":
      return status;
    case "createdAt":
      return row.createdAt;
    case "updatedAt":
      return row.updatedAt;
    case "publishedAt":
      return row.publishedAt;
    case "updatedBy":
      return updatedBy;
    /* istanbul ignore next -- unreachable: name is already filtered to LISTABLE_SYSTEM_COLUMNS */
    default:
      return null;
  }
}
