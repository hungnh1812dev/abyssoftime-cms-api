import { DocumentEntity, DocumentStatus } from "../../domain/entities/document.entity";

export function resolveStatus(draftToPublish: boolean, draftUpdatedAt: Date | null, publishedUpdatedAt: Date | null): DocumentStatus {
  if (!draftToPublish) {
    return "published";
  }
  if (!publishedUpdatedAt) {
    return "draft";
  }
  if (draftUpdatedAt && draftUpdatedAt > publishedUpdatedAt) {
    return "modified";
  }
  return "published";
}

export function resolveBatchStatuses(draftToPublish: boolean, draftRows: DocumentEntity[], publishedRows: DocumentEntity[]): Map<string, DocumentStatus> {
  const publishedUpdatedAtByDocumentId = new Map(publishedRows.map((row) => [row.documentId, row.updatedAt]));

  const statuses = new Map<string, DocumentStatus>();
  for (const draft of draftRows) {
    const publishedUpdatedAt = publishedUpdatedAtByDocumentId.get(draft.documentId) ?? null;
    statuses.set(draft.documentId, resolveStatus(draftToPublish, draft.updatedAt, publishedUpdatedAt));
  }
  return statuses;
}
