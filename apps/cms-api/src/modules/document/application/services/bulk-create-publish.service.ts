import { ContentTypeEntity } from "../../../content-type/domain/entities/content-type.entity";
import { DocumentEntity } from "../../domain/entities/document.entity";
import { SchemaResolverService } from "../support/schema-resolver.service";

import { Injectable } from "@nestjs/common";

import { DeleteDocumentService } from "./delete-document.service";
import { PublishDocumentService } from "./publish-document.service";
import { SaveDocumentService } from "./save-document.service";

const CHUNK_SIZE = 5;

type ItemOutcome = { ok: true; result: DocumentEntity } | { ok: false; error: unknown; createdDoc?: DocumentEntity };

function chunksOf<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

@Injectable()
export class BulkCreateAndPublishService {
  constructor(
    private readonly saveDocument: SaveDocumentService,
    private readonly publishDocument: PublishDocumentService,
    private readonly deleteDocument: DeleteDocumentService,
    private readonly schemaResolver: SchemaResolverService,
  ) {}

  async execute(slug: string, itemsData: Record<string, unknown>[], userId: string | null): Promise<DocumentEntity[]> {
    const contentType = await this.schemaResolver.resolve(slug);
    const created: DocumentEntity[] = [];
    const results: DocumentEntity[] = [];

    for (const chunk of chunksOf(itemsData, CHUNK_SIZE)) {
      const outcomes = await Promise.all(chunk.map((data) => this.processItem(slug, contentType, data, userId)));

      let failure: unknown;
      for (const outcome of outcomes) {
        if (outcome.ok) {
          created.push(outcome.result);
          results.push(outcome.result);
        } else {
          if (outcome.createdDoc) created.push(outcome.createdDoc);
          failure ??= outcome.error;
        }
      }

      if (failure !== undefined) {
        await this.rollback(slug, created);
        throw failure as Error;
      }
    }

    return results;
  }

  private async processItem(slug: string, contentType: ContentTypeEntity, data: Record<string, unknown>, userId: string | null): Promise<ItemOutcome> {
    let savedDoc: DocumentEntity | undefined;
    try {
      savedDoc = await this.saveDocument.execute(slug, data, undefined, userId, contentType);
      if (savedDoc.version !== "draft") return { ok: true, result: savedDoc };

      const published = await this.publishDocument.execute(slug, savedDoc.documentId, userId, contentType, savedDoc, true);
      return { ok: true, result: published };
    } catch (error) {
      return { ok: false, error, createdDoc: savedDoc };
    }
  }

  private async rollback(slug: string, created: DocumentEntity[]): Promise<void> {
    for (const doc of created) {
      await this.deleteDocument.execute(slug, doc.documentId);
    }
  }
}
