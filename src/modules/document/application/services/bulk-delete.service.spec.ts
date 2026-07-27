import { NotFoundException } from "@nestjs/common";

import { BulkDeleteService } from "./bulk-delete.service";
import { DeleteDocumentService } from "./delete-document.service";

describe("BulkDeleteService", () => {
  function buildDeps() {
    const deleteDocument = { execute: jest.fn() } as unknown as jest.Mocked<DeleteDocumentService>;
    return { deleteDocument };
  }

  it("deletes every ID successfully, in order, with no error field", async () => {
    const { deleteDocument } = buildDeps();
    deleteDocument.execute.mockResolvedValue(undefined);

    const service = new BulkDeleteService(deleteDocument);
    const results = await service.execute("cv-page", ["doc-1", "doc-2", "doc-3"]);

    expect(deleteDocument.execute).toHaveBeenNthCalledWith(1, "cv-page", "doc-1");
    expect(deleteDocument.execute).toHaveBeenNthCalledWith(2, "cv-page", "doc-2");
    expect(deleteDocument.execute).toHaveBeenNthCalledWith(3, "cv-page", "doc-3");
    expect(results).toEqual([{ documentId: "doc-1" }, { documentId: "doc-2" }, { documentId: "doc-3" }]);
  });

  it("continues processing the rest of the batch when one ID fails (partial success, no rollback)", async () => {
    const { deleteDocument } = buildDeps();
    deleteDocument.execute.mockResolvedValueOnce(undefined).mockRejectedValueOnce(new NotFoundException('Document "doc-2" not found')).mockResolvedValueOnce(undefined);

    const service = new BulkDeleteService(deleteDocument);
    const results = await service.execute("cv-page", ["doc-1", "doc-2", "doc-3"]);

    expect(deleteDocument.execute).toHaveBeenCalledTimes(3);
    expect(results).toEqual([{ documentId: "doc-1" }, { documentId: "doc-2", error: 'Document "doc-2" not found' }, { documentId: "doc-3" }]);
  });

  it("reports an error for every ID when all fail, without throwing", async () => {
    const { deleteDocument } = buildDeps();
    deleteDocument.execute.mockRejectedValue(new NotFoundException("not found"));

    const service = new BulkDeleteService(deleteDocument);
    const results = await service.execute("cv-page", ["doc-1", "doc-2"]);

    expect(results).toEqual([
      { documentId: "doc-1", error: "not found" },
      { documentId: "doc-2", error: "not found" },
    ]);
  });

  it("returns an empty array for an empty slice without touching the repository", async () => {
    const { deleteDocument } = buildDeps();

    const service = new BulkDeleteService(deleteDocument);
    const results = await service.execute("cv-page", []);

    expect(results).toEqual([]);
    expect(deleteDocument.execute).not.toHaveBeenCalled();
  });

  it("falls back to a string conversion when a rejection is not an Error instance", async () => {
    const { deleteDocument } = buildDeps();
    deleteDocument.execute.mockRejectedValue("boom");

    const service = new BulkDeleteService(deleteDocument);
    const results = await service.execute("cv-page", ["doc-1"]);

    expect(results).toEqual([{ documentId: "doc-1", error: "boom" }]);
  });
});
