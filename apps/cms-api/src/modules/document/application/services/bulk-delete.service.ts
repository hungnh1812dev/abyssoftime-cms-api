import { Injectable } from "@nestjs/common";

import { PrismaService } from "@/prisma/application/prisma.service";

import { DeleteDocumentService } from "./delete-document.service";

@Injectable()
export class BulkDeleteService {
  constructor(
    private readonly deleteDocument: DeleteDocumentService,
    private readonly prisma: PrismaService,
  ) {}

  async execute(slug: string, documentIds: string[]): Promise<string[]> {
    if (documentIds.length === 0) return [];

    await this.prisma.$transaction(async (tx) => {
      for (const documentId of documentIds) {
        await this.deleteDocument.execute(slug, documentId, tx);
      }
    });

    return documentIds;
  }
}
