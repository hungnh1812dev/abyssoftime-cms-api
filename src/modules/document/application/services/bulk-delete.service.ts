import { Injectable } from "@nestjs/common";

import { DeleteDocumentService } from "./delete-document.service";

export interface BulkDeleteResult {
  documentId: string;
  error?: string;
}

@Injectable()
export class BulkDeleteService {
  constructor(private readonly deleteDocument: DeleteDocumentService) {}

  async execute(slug: string, documentIds: string[]): Promise<BulkDeleteResult[]> {
    const results: BulkDeleteResult[] = [];

    for (const documentId of documentIds) {
      try {
        await this.deleteDocument.execute(slug, documentId);
        results.push({ documentId });
      } catch (err) {
        results.push({ documentId, error: err instanceof Error ? err.message : String(err) });
      }
    }

    return results;
  }
}
