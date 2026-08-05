import { Injectable } from "@nestjs/common";

import { PrismaService } from "@/prisma/application/prisma.service";

import { DeleteDocumentService } from "./delete-document.service";

// Prisma's default interactive-transaction timeout is 5000ms, sized for a single document's own
// delete (~15 sequential round trips). BulkDeleteDto allows up to 100 ids per batch, all serialized
// on this one spanning transaction's single reserved connection — well past the default under real
// network latency. Sized generously per id (never below the 5000ms default) rather than tied to
// BulkDeleteDto's cap directly, so it stays correct if that cap ever changes.
const DEFAULT_TRANSACTION_TIMEOUT_MS = 5000;
const TRANSACTION_TIMEOUT_MS_PER_ID = 2000;

@Injectable()
export class BulkDeleteService {
  constructor(
    private readonly deleteDocument: DeleteDocumentService,
    private readonly prisma: PrismaService,
  ) {}

  async execute(slug: string, documentIds: string[]): Promise<string[]> {
    if (documentIds.length === 0) return [];

    await this.prisma.$transaction(
      async (tx) => {
        for (const documentId of documentIds) {
          await this.deleteDocument.execute(slug, documentId, tx);
        }
      },
      { timeout: Math.max(DEFAULT_TRANSACTION_TIMEOUT_MS, documentIds.length * TRANSACTION_TIMEOUT_MS_PER_ID) },
    );

    return documentIds;
  }
}
