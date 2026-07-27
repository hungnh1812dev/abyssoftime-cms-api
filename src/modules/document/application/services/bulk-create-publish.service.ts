import { DocumentEntity } from "../../domain/entities/document.entity";

import { Injectable } from "@nestjs/common";

import { DeleteDocumentService } from "./delete-document.service";
import { PublishDocumentService } from "./publish-document.service";
import { SaveDocumentService } from "./save-document.service";

@Injectable()
export class BulkCreateAndPublishService {
  constructor(
    private readonly saveDocument: SaveDocumentService,
    private readonly publishDocument: PublishDocumentService,
    private readonly deleteDocument: DeleteDocumentService,
  ) {}

  async execute(slug: string, itemsData: Record<string, unknown>[], userId: string | null): Promise<DocumentEntity[]> {
    const created: DocumentEntity[] = [];
    const results: DocumentEntity[] = [];

    for (const data of itemsData) {
      try {
        const saved = await this.saveDocument.execute(slug, data, undefined, userId);
        created.push(saved);

        if (saved.version === "draft") {
          results.push(await this.publishDocument.execute(slug, saved.documentId, userId));
        } else {
          results.push(saved);
        }
      } catch (err) {
        await this.rollback(slug, created);
        throw err;
      }
    }

    return results;
  }

  private async rollback(slug: string, created: DocumentEntity[]): Promise<void> {
    for (const doc of created) {
      await this.deleteDocument.execute(slug, doc.documentId);
    }
  }
}
