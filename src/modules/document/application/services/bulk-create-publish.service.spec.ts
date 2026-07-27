import { DocumentEntity } from "../../domain/entities/document.entity";

import { BulkCreateAndPublishService } from "./bulk-create-publish.service";
import { DeleteDocumentService } from "./delete-document.service";
import { PublishDocumentService } from "./publish-document.service";
import { SaveDocumentService } from "./save-document.service";

describe("BulkCreateAndPublishService", () => {
  function draftDoc(id: string, fields: Record<string, unknown>): DocumentEntity {
    return new DocumentEntity(id, "draft", fields, new Date(), new Date(), null, "user-1", "user-1", null);
  }

  function publishedDoc(id: string, fields: Record<string, unknown>): DocumentEntity {
    return new DocumentEntity(id, "published", fields, new Date(), new Date(), new Date(), "user-1", "user-1", "user-1");
  }

  function buildDeps() {
    const saveDocument = { execute: jest.fn() } as unknown as jest.Mocked<SaveDocumentService>;
    const publishDocument = { execute: jest.fn() } as unknown as jest.Mocked<PublishDocumentService>;
    const deleteDocument = { execute: jest.fn().mockResolvedValue(undefined) } as unknown as jest.Mocked<DeleteDocumentService>;
    return { saveDocument, publishDocument, deleteDocument };
  }

  it("saves and publishes each item in order, sequentially (mode A)", async () => {
    const { saveDocument, publishDocument, deleteDocument } = buildDeps();
    const callOrder: string[] = [];
    let saveCount = 0;

    saveDocument.execute.mockImplementation((_slug, data) => {
      callOrder.push(`save:${JSON.stringify(data)}`);
      saveCount += 1;
      return Promise.resolve(draftDoc(`doc-${saveCount}`, data));
    });
    publishDocument.execute.mockImplementation((_slug, documentId) => {
      callOrder.push(`publish:${documentId}`);
      return Promise.resolve(publishedDoc(documentId, {}));
    });

    const service = new BulkCreateAndPublishService(saveDocument, publishDocument, deleteDocument);
    const items = [{ position: "A" }, { position: "B" }];
    const results = await service.execute("cv-page", items, "user-1");

    expect(saveDocument.execute).toHaveBeenNthCalledWith(1, "cv-page", items[0], undefined, "user-1");
    expect(saveDocument.execute).toHaveBeenNthCalledWith(2, "cv-page", items[1], undefined, "user-1");
    expect(publishDocument.execute).toHaveBeenNthCalledWith(1, "cv-page", "doc-1", "user-1");
    expect(publishDocument.execute).toHaveBeenNthCalledWith(2, "cv-page", "doc-2", "user-1");

    expect(callOrder).toEqual(['save:{"position":"A"}', "publish:doc-1", 'save:{"position":"B"}', "publish:doc-2"]);
    expect(results.map((doc) => doc.documentId)).toEqual(["doc-1", "doc-2"]);
    expect(results.every((doc) => doc.version === "published")).toBe(true);
    expect(deleteDocument.execute).not.toHaveBeenCalled();
  });

  it("saves each item without publishing when the content type is draftToPublish: false (mode B)", async () => {
    const { saveDocument, publishDocument, deleteDocument } = buildDeps();
    saveDocument.execute.mockImplementation((_slug, data) => Promise.resolve(publishedDoc("doc-1", data)));

    const service = new BulkCreateAndPublishService(saveDocument, publishDocument, deleteDocument);
    const results = await service.execute("cv-single", [{ position: "A" }], "user-1");

    expect(saveDocument.execute).toHaveBeenCalledTimes(1);
    expect(publishDocument.execute).not.toHaveBeenCalled();
    expect(deleteDocument.execute).not.toHaveBeenCalled();
    expect(results).toEqual([publishedDoc("doc-1", { position: "A" })]);
  });

  it("rolls back all prior items when a Save call mid-batch fails (mode A)", async () => {
    const { saveDocument, publishDocument, deleteDocument } = buildDeps();
    saveDocument.execute
      .mockImplementationOnce((_slug, data) => Promise.resolve(draftDoc("doc-1", data)))
      .mockImplementationOnce((_slug, data) => Promise.resolve(draftDoc("doc-2", data)))
      .mockRejectedValueOnce(new Error("save failed"));
    publishDocument.execute.mockImplementation((_slug, documentId) => Promise.resolve(publishedDoc(documentId, {})));

    const service = new BulkCreateAndPublishService(saveDocument, publishDocument, deleteDocument);
    const items = [{ position: "A" }, { position: "B" }, { position: "C" }];

    await expect(service.execute("cv-page", items, "user-1")).rejects.toThrow("save failed");

    expect(deleteDocument.execute).toHaveBeenCalledTimes(2);
    expect(deleteDocument.execute).toHaveBeenCalledWith("cv-page", "doc-1");
    expect(deleteDocument.execute).toHaveBeenCalledWith("cv-page", "doc-2");
  });

  it("rolls back the current item too when a Publish call fails (not just prior ones)", async () => {
    const { saveDocument, publishDocument, deleteDocument } = buildDeps();
    saveDocument.execute
      .mockImplementationOnce((_slug, data) => Promise.resolve(draftDoc("doc-1", data)))
      .mockImplementationOnce((_slug, data) => Promise.resolve(draftDoc("doc-2", data)));
    publishDocument.execute.mockImplementationOnce((_slug, documentId) => Promise.resolve(publishedDoc(documentId, {}))).mockRejectedValueOnce(new Error("publish failed"));

    const service = new BulkCreateAndPublishService(saveDocument, publishDocument, deleteDocument);
    const items = [{ position: "A" }, { position: "B" }];

    await expect(service.execute("cv-page", items, "user-1")).rejects.toThrow("publish failed");

    expect(deleteDocument.execute).toHaveBeenCalledTimes(2);
    expect(deleteDocument.execute).toHaveBeenCalledWith("cv-page", "doc-1");
    expect(deleteDocument.execute).toHaveBeenCalledWith("cv-page", "doc-2");
  });

  it("does not roll back anything when the very first item fails on Save", async () => {
    const { saveDocument, publishDocument, deleteDocument } = buildDeps();
    saveDocument.execute.mockRejectedValueOnce(new Error("save failed"));

    const service = new BulkCreateAndPublishService(saveDocument, publishDocument, deleteDocument);

    await expect(service.execute("cv-page", [{ position: "A" }], "user-1")).rejects.toThrow("save failed");
    expect(deleteDocument.execute).not.toHaveBeenCalled();
  });
});
