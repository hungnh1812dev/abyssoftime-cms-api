import { NotFoundException } from "@nestjs/common";

import { PrismaService } from "@/prisma/application/prisma.service";

import { BulkDeleteService } from "./bulk-delete.service";
import { DeleteDocumentService } from "./delete-document.service";

describe("BulkDeleteService", () => {
  const TX = { fake: "tx" };

  function buildDeps() {
    const transactionOptions: { timeout?: number }[] = [];
    const deleteDocument = { execute: jest.fn() } as unknown as jest.Mocked<DeleteDocumentService>;
    const prisma = {
      $transaction: jest.fn((callback: (tx: unknown) => Promise<unknown>, options?: { timeout?: number }) => {
        transactionOptions.push(options ?? {});
        return callback(TX);
      }),
    } as unknown as jest.Mocked<PrismaService>;
    return { deleteDocument, prisma, transactionOptions };
  }

  it("deletes every ID inside one spanning transaction and returns the deleted IDs in order", async () => {
    const { deleteDocument, prisma } = buildDeps();
    deleteDocument.execute.mockResolvedValue(undefined);

    const service = new BulkDeleteService(deleteDocument, prisma);
    const result = await service.execute("cv-page", ["doc-1", "doc-2", "doc-3"]);

    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(deleteDocument.execute).toHaveBeenNthCalledWith(1, "cv-page", "doc-1", TX);
    expect(deleteDocument.execute).toHaveBeenNthCalledWith(2, "cv-page", "doc-2", TX);
    expect(deleteDocument.execute).toHaveBeenNthCalledWith(3, "cv-page", "doc-3", TX);
    expect(result).toEqual(["doc-1", "doc-2", "doc-3"]);
  });

  it("rolls back every delete in the batch when one ID fails, propagating the error", async () => {
    const { deleteDocument, prisma } = buildDeps();
    deleteDocument.execute.mockResolvedValueOnce(undefined).mockRejectedValueOnce(new NotFoundException('Document "doc-2" not found'));

    const service = new BulkDeleteService(deleteDocument, prisma);

    await expect(service.execute("cv-page", ["doc-1", "doc-2", "doc-3"])).rejects.toThrow(NotFoundException);
    expect(deleteDocument.execute).toHaveBeenCalledTimes(2);
  });

  it("passes Prisma's default transaction timeout for a small batch", async () => {
    const { deleteDocument, prisma, transactionOptions } = buildDeps();
    deleteDocument.execute.mockResolvedValue(undefined);

    const service = new BulkDeleteService(deleteDocument, prisma);
    await service.execute("cv-page", ["doc-1"]);

    expect(transactionOptions[0]?.timeout).toBe(5000);
  });

  it("scales the transaction timeout up for a full 100-id batch, past Prisma's 5000ms default", async () => {
    const { deleteDocument, prisma, transactionOptions } = buildDeps();
    deleteDocument.execute.mockResolvedValue(undefined);

    const service = new BulkDeleteService(deleteDocument, prisma);
    const hundredIds = Array.from({ length: 100 }, (_, index) => `doc-${index}`);
    await service.execute("cv-page", hundredIds);

    // Prisma's interactive-transaction default (5000ms) is sized for a single item's own
    // ~15-round-trip delete; a 100-item batch (BulkDeleteDto's ArrayMaxSize) serializes that
    // cost on one connection, so this must opt out of the default rather than risk a
    // "Transaction already closed" (P2028) on a large batch under real network latency.
    expect(transactionOptions[0]?.timeout).toBeGreaterThan(5000);
  });

  it("returns an empty array for an empty slice without opening a transaction", async () => {
    const { deleteDocument, prisma } = buildDeps();

    const service = new BulkDeleteService(deleteDocument, prisma);
    const result = await service.execute("cv-page", []);

    expect(result).toEqual([]);
    expect(prisma.$transaction).not.toHaveBeenCalled();
    expect(deleteDocument.execute).not.toHaveBeenCalled();
  });
});
