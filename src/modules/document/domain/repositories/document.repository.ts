import { DocumentEntity, DocumentVersion } from "../entities/document.entity";

import { FieldDefinition } from "@/modules/content-type/domain/entities/field-definition";
import { ParsedFilter } from "@/modules/document/domain/entities/filter";
import { Prisma } from "@/prisma/application/client";

export interface ListOptions {
  start: number;
  size: number;
  orderBy: string;
  sortDir: "asc" | "desc";
  search?: string;
  listFields: string[];
  searchableFields: string[];
  filters: ParsedFilter[];
}

export interface IDocumentRepository {
  findByVersion(slug: string, documentId: string, version: DocumentVersion, fields: FieldDefinition[]): Promise<DocumentEntity | null>;
  upsert(slug: string, doc: DocumentEntity, fields: FieldDefinition[], tx?: Prisma.TransactionClient): Promise<void>;
  deleteAllVersions(slug: string, documentId: string, tx?: Prisma.TransactionClient): Promise<void>;
  deleteVersion(slug: string, documentId: string, version: DocumentVersion, tx?: Prisma.TransactionClient): Promise<void>;
  listPaginated(slug: string, version: DocumentVersion, opts: ListOptions, fields: FieldDefinition[]): Promise<{ rows: DocumentEntity[]; total: number }>;
  findManyByVersion(slug: string, documentIds: string[], version: DocumentVersion, fields: FieldDefinition[]): Promise<DocumentEntity[]>;
  findSingle(slug: string, version: DocumentVersion, fields: FieldDefinition[]): Promise<DocumentEntity | null>;
}

export const DOCUMENT_REPOSITORY = Symbol("DOCUMENT_REPOSITORY");
