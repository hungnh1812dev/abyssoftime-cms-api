export type DocumentVersion = "draft" | "published";
export type DocumentStatus = "draft" | "modified" | "published";

export class DocumentEntity {
  constructor(
    public readonly documentId: string,
    public readonly version: DocumentVersion,
    public readonly fields: Record<string, unknown>,
    public readonly createdAt: Date,
    public readonly updatedAt: Date,
    public readonly publishedAt: Date | null,
    public readonly createdBy: string | null,
    public readonly updatedBy: string | null,
    public readonly publishedBy: string | null,
    // DB-generated (BIGSERIAL) — undefined for an entity built in memory
    // before its first insert; always populated once mapped from a row.
    public readonly id?: number,
  ) {}
}
