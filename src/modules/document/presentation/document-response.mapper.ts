import { DocumentEntity, DocumentStatus } from "../domain/entities/document.entity";

export interface ResolvedUpdatedBy {
  documentId: string;
  name: string;
}

export interface DocumentResponse {
  data: {
    documentId: string;
    status: DocumentStatus;
    createdAt: Date;
    updatedAt: Date;
    updatedBy?: ResolvedUpdatedBy | null;
    [fieldName: string]: unknown;
  };
}

// updatedBy is omitted (not `null`) when the caller doesn't pass it — PublicDocumentController's
// existing call sites stay untouched and their response shape doesn't gain the field at all.
export function toDocumentResponse(document: DocumentEntity, status: DocumentStatus, updatedBy?: ResolvedUpdatedBy | null): DocumentResponse {
  return {
    data: {
      ...document.fields,
      documentId: document.documentId,
      status,
      createdAt: document.createdAt,
      updatedAt: document.updatedAt,
      ...(updatedBy !== undefined ? { updatedBy } : {}),
    },
  };
}
