export interface FieldDefinition {
  name: string;
  type: "text" | "richtext" | "number" | "boolean" | "media" | "json" | "component";
  width?: "100%" | "50%" | "1/3";
  header?: boolean;
  component?: string;
  repeatable?: boolean;
  fields?: FieldDefinition[];
}

export interface ContentTypeSummary {
  slug: string;
  name: string;
  kind: "single" | "collection";
  draftToPublish: boolean;
}

export interface ContentType extends ContentTypeSummary {
  documentId: string;
  fields: FieldDefinition[];
  listFields: string[];
  createdAt: string;
  updatedAt: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  start: number;
  size: number;
}

export type EntryStatus = "draft" | "modified" | "published";

export interface DocumentUpdatedBy {
  documentId: string;
  name: string;
}

export interface Document {
  data: {
    documentId: string;
    status: EntryStatus;
    createdAt: string;
    updatedAt: string;
    publishedAt?: string | null;
    updatedBy: DocumentUpdatedBy | null;
    [key: string]: unknown;
  };
}

// Shape of one row from GET /documents/collection-type/:slug (list) —
// confirmed against the live API to differ from the single-document fetch
// shape above: system columns are siblings of `data`, not nested inside it,
// and `data` holds only the content-type's configured `listFields` content
// columns (never system columns, regardless of listFields config).
export interface ListedDocumentItem {
  // DB-generated autoincrement key — internal ordering only, not a stable
  // public identifier; use documentId for that.
  id: number;
  documentId: string;
  status: EntryStatus;
  createdAt: string;
  updatedAt: string;
  publishedAt?: string | null;
  updatedBy: DocumentUpdatedBy | null;
  data: Record<string, unknown>;
}

// System columns that can appear inside a document's `data` (always on a
// full document fetch; only when configured into a content type's
// `listFields` on a collection-list row) — stripped before `data` is fed
// into a react-hook-form instance, so the form only ever sees user-editable
// schema fields.
export const SYSTEM_FIELDS = ["documentId", "status", "createdAt", "updatedAt", "publishedAt", "updatedBy"] as const;

export function stripSystemFields(data: Record<string, unknown>): Record<string, unknown> {
  const content: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data)) {
    if (!(SYSTEM_FIELDS as readonly string[]).includes(key)) {
      content[key] = value;
    }
  }
  return content;
}

// Locale support is hidden in the UI (this backend has no locale/i18n
// module), but the type is kept so the orphaned locale files
// (InternationalizePage, LocaleSelector, useLocales*) still typecheck.
export interface Locale {
  code: string;
  name: string;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface MediaAsset {
  documentId: string;
  fileName: string;
  mimeType: string;
  size: number;
  width: number;
  height: number;
  url: string;
  thumbnailUrl: string;
  publicId: string;
  hash: string;
  uploadedBy: string | null;
  createdAt: string;
  updatedAt: string;
}
