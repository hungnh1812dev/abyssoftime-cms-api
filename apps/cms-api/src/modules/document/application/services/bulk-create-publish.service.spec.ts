import { ContentTypeEntity } from "../../../content-type/domain/entities/content-type.entity";
import { DocumentEntity } from "../../domain/entities/document.entity";
import { SchemaResolverService } from "../support/schema-resolver.service";

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

  const contentType = { name: "cv-page" } as unknown as ContentTypeEntity;

  function buildDeps() {
    const saveDocument = { execute: jest.fn() } as unknown as jest.Mocked<SaveDocumentService>;
    const publishDocument = { execute: jest.fn() } as unknown as jest.Mocked<PublishDocumentService>;
    const deleteDocument = { execute: jest.fn().mockResolvedValue(undefined) } as unknown as jest.Mocked<DeleteDocumentService>;
    const schemaResolver = { resolve: jest.fn().mockResolvedValue(contentType) } as unknown as jest.Mocked<SchemaResolverService>;
    return { saveDocument, publishDocument, deleteDocument, schemaResolver };
  }

  function buildService(deps: ReturnType<typeof buildDeps>): BulkCreateAndPublishService {
    return new BulkCreateAndPublishService(deps.saveDocument, deps.publishDocument, deps.deleteDocument, deps.schemaResolver);
  }

  function makeItems(count: number): Record<string, unknown>[] {
    return Array.from({ length: count }, (_, i) => ({ position: `item-${i}` }));
  }

  function autoSaveAndPublish(deps: ReturnType<typeof buildDeps>): void {
    let counter = 0;
    deps.saveDocument.execute.mockImplementation((_slug, data) => {
      counter += 1;
      return Promise.resolve(draftDoc(`doc-${counter}`, data));
    });
    deps.publishDocument.execute.mockImplementation((_slug, documentId) => Promise.resolve(publishedDoc(documentId, {})));
  }

  it("resolves the content type once and reuses it for every item", async () => {
    const deps = buildDeps();
    autoSaveAndPublish(deps);
    const service = buildService(deps);

    await service.execute("cv-page", makeItems(3), "user-1");

    expect(deps.schemaResolver.resolve).toHaveBeenCalledTimes(1);
    expect(deps.schemaResolver.resolve).toHaveBeenCalledWith("cv-page");
    expect(deps.saveDocument.execute).toHaveBeenCalledWith("cv-page", expect.any(Object), undefined, "user-1", contentType);
  });

  it("saves and publishes all items across more than one chunk, preserving original order (mode A)", async () => {
    const deps = buildDeps();
    autoSaveAndPublish(deps);
    const service = buildService(deps);
    const items = makeItems(7); // CHUNK_SIZE (5) + 2 → spans two chunks

    const results = await service.execute("cv-page", items, "user-1");

    expect(deps.saveDocument.execute).toHaveBeenCalledTimes(7);
    expect(deps.publishDocument.execute).toHaveBeenCalledTimes(7);
    expect(results).toHaveLength(7);
    expect(results.every((doc) => doc.version === "published")).toBe(true);
    expect(results.map((doc) => doc.fields)).toEqual(items.map(() => ({})));
    expect(deps.deleteDocument.execute).not.toHaveBeenCalled();
  });

  it("saves each item without publishing when the content type is draftToPublish: false (mode B)", async () => {
    const deps = buildDeps();
    const expectedDoc = publishedDoc("doc-1", { position: "A" });
    deps.saveDocument.execute.mockImplementation(() => Promise.resolve(expectedDoc));
    const service = buildService(deps);

    const results = await service.execute("cv-single", [{ position: "A" }], "user-1");

    expect(deps.saveDocument.execute).toHaveBeenCalledTimes(1);
    expect(deps.publishDocument.execute).not.toHaveBeenCalled();
    expect(deps.deleteDocument.execute).not.toHaveBeenCalled();
    expect(results).toEqual([expectedDoc]);
  });

  it("handles a single-item batch", async () => {
    const deps = buildDeps();
    autoSaveAndPublish(deps);
    const service = buildService(deps);

    const results = await service.execute("cv-page", makeItems(1), "user-1");

    expect(results).toHaveLength(1);
    expect(deps.saveDocument.execute).toHaveBeenCalledTimes(1);
    expect(deps.publishDocument.execute).toHaveBeenCalledTimes(1);
  });

  it("processes a batch that is an exact multiple of CHUNK_SIZE", async () => {
    const deps = buildDeps();
    autoSaveAndPublish(deps);
    const service = buildService(deps);

    const results = await service.execute("cv-page", makeItems(5), "user-1");

    expect(results).toHaveLength(5);
    expect(deps.saveDocument.execute).toHaveBeenCalledTimes(5);
  });

  it("processes a batch one item past a chunk boundary (CHUNK_SIZE + 1)", async () => {
    const deps = buildDeps();
    autoSaveAndPublish(deps);
    const service = buildService(deps);

    const results = await service.execute("cv-page", makeItems(6), "user-1");

    expect(results).toHaveLength(6);
    expect(deps.saveDocument.execute).toHaveBeenCalledTimes(6);
  });

  it("does not roll back anything when the very first item fails on Save", async () => {
    const deps = buildDeps();
    deps.saveDocument.execute.mockRejectedValueOnce(new Error("save failed"));
    const service = buildService(deps);

    await expect(service.execute("cv-page", [{ position: "A" }], "user-1")).rejects.toThrow("save failed");
    expect(deps.deleteDocument.execute).not.toHaveBeenCalled();
  });

  it("rolls back only the items created in the failing chunk when Save fails mid-chunk", async () => {
    const deps = buildDeps();
    let counter = 0;
    deps.saveDocument.execute.mockImplementation((_slug, data) => {
      counter += 1;
      if (counter === 3) return Promise.reject(new Error("save failed"));
      return Promise.resolve(draftDoc(`doc-${counter}`, data));
    });
    deps.publishDocument.execute.mockImplementation((_slug, documentId) => Promise.resolve(publishedDoc(documentId, {})));
    const service = buildService(deps);
    const items = makeItems(4); // single chunk (< CHUNK_SIZE), item 3 fails

    await expect(service.execute("cv-page", items, "user-1")).rejects.toThrow("save failed");

    expect(deps.deleteDocument.execute).toHaveBeenCalledTimes(3);
    expect(deps.deleteDocument.execute).toHaveBeenCalledWith("cv-page", "doc-1");
    expect(deps.deleteDocument.execute).toHaveBeenCalledWith("cv-page", "doc-2");
    expect(deps.deleteDocument.execute).toHaveBeenCalledWith("cv-page", "doc-4");
  });

  it("rolls back the prior successful chunk plus same-chunk successes when a later chunk fails", async () => {
    const deps = buildDeps();
    let counter = 0;
    deps.saveDocument.execute.mockImplementation((_slug, data) => {
      counter += 1;
      // Chunk 1: items 1-5 all succeed. Chunk 2: item 7 (index 1 of chunk 2) fails.
      if (counter === 7) return Promise.reject(new Error("save failed"));
      return Promise.resolve(draftDoc(`doc-${counter}`, data));
    });
    deps.publishDocument.execute.mockImplementation((_slug, documentId) => Promise.resolve(publishedDoc(documentId, {})));
    const service = buildService(deps);
    const items = makeItems(8); // chunk 1: 1-5, chunk 2: 6-8, item 7 fails

    await expect(service.execute("cv-page", items, "user-1")).rejects.toThrow("save failed");

    // All of chunk 1 (5 items) rolled back, plus doc-6 and doc-8 (same-chunk successes alongside the failure).
    expect(deps.deleteDocument.execute).toHaveBeenCalledTimes(7);
    for (const id of ["doc-1", "doc-2", "doc-3", "doc-4", "doc-5", "doc-6", "doc-8"]) {
      expect(deps.deleteDocument.execute).toHaveBeenCalledWith("cv-page", id);
    }
  });

  it("rolls back once per created doc when two items in the same chunk fail", async () => {
    const deps = buildDeps();
    let counter = 0;
    deps.saveDocument.execute.mockImplementation((_slug, data) => {
      counter += 1;
      if (counter === 2 || counter === 4) return Promise.reject(new Error(`save ${counter} failed`));
      return Promise.resolve(draftDoc(`doc-${counter}`, data));
    });
    deps.publishDocument.execute.mockImplementation((_slug, documentId) => Promise.resolve(publishedDoc(documentId, {})));
    const service = buildService(deps);
    const items = makeItems(5); // single chunk, items 2 and 4 fail

    await expect(service.execute("cv-page", items, "user-1")).rejects.toThrow(/save (2|4) failed/);

    expect(deps.deleteDocument.execute).toHaveBeenCalledTimes(3);
    for (const id of ["doc-1", "doc-3", "doc-5"]) {
      expect(deps.deleteDocument.execute).toHaveBeenCalledWith("cv-page", id);
    }
  });

  it("rolls back the created draft too when Publish fails after Save succeeds", async () => {
    const deps = buildDeps();
    deps.saveDocument.execute.mockImplementationOnce((_slug, data) => Promise.resolve(draftDoc("doc-1", data)));
    deps.publishDocument.execute.mockRejectedValueOnce(new Error("publish failed"));
    const service = buildService(deps);

    await expect(service.execute("cv-page", [{ position: "A" }], "user-1")).rejects.toThrow("publish failed");

    expect(deps.deleteDocument.execute).toHaveBeenCalledTimes(1);
    expect(deps.deleteDocument.execute).toHaveBeenCalledWith("cv-page", "doc-1");
  });

  it("does not roll back a doc whose Save failed before any doc was created for that item", async () => {
    const deps = buildDeps();
    deps.saveDocument.execute.mockImplementationOnce((_slug, data) => Promise.resolve(draftDoc("doc-1", data))).mockRejectedValueOnce(new Error("save failed"));
    deps.publishDocument.execute.mockImplementation((_slug, documentId) => Promise.resolve(publishedDoc(documentId, {})));
    const service = buildService(deps);

    await expect(service.execute("cv-page", makeItems(2), "user-1")).rejects.toThrow("save failed");

    expect(deps.deleteDocument.execute).toHaveBeenCalledTimes(1);
    expect(deps.deleteDocument.execute).toHaveBeenCalledWith("cv-page", "doc-1");
  });
});
