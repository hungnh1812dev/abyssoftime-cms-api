import { DocumentEntity, DocumentStatus } from "../domain/entities/document.entity";

export interface DocumentResponse {
  data: {
    documentId: string;
    status: DocumentStatus;
    createdAt: Date;
    updatedAt: Date;
    [fieldName: string]: unknown;
  };
}

export function toDocumentResponse(document: DocumentEntity, status: DocumentStatus): DocumentResponse {
  return {
    data: {
      ...document.fields,
      documentId: document.documentId,
      status,
      createdAt: document.createdAt,
      updatedAt: document.updatedAt,
    },
  };
}
