import { NotFoundException } from "@nestjs/common";

import { PrismaService } from "@/prisma/application/prisma.service";

import { BulkDeleteService } from "./bulk-delete.service";
import { DeleteDocumentService } from "./delete-document.service";

describe("BulkDeleteService", () => {
  const TX = { fake: "tx" };

  function buildDeps() {
    const deleteDocument = { execute: jest.fn() } as unknown as jest.Mocked<DeleteDocumentService>;
    const prisma = { $transaction: jest.fn((callback: (tx: unknown) => Promise<unknown>) => callback(TX)) } as unknown as jest.Mocked<PrismaService>;
    return { deleteDocument, prisma };
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

  it("returns an empty array for an empty slice without opening a transaction", async () => {
    const { deleteDocument, prisma } = buildDeps();

    const service = new BulkDeleteService(deleteDocument, prisma);
    const result = await service.execute("cv-page", []);

    expect(result).toEqual([]);
    expect(prisma.$transaction).not.toHaveBeenCalled();
    expect(deleteDocument.execute).not.toHaveBeenCalled();
  });
});
