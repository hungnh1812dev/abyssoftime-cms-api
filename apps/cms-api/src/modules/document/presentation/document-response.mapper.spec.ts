import { DocumentEntity } from "../domain/entities/document.entity";

import { toDocumentResponse } from "./document-response.mapper";

describe("toDocumentResponse", () => {
  const now = new Date("2026-01-01T00:00:00.000Z");
  const document = new DocumentEntity("doc-1", "draft", { position: "Engineer" }, now, now, null, "caller-1", "caller-1", null);

  it("spreads fields and adds the fixed envelope fields, including the resolved updatedBy", () => {
    const result = toDocumentResponse(document, "draft", { documentId: "caller-1", name: "Jane Doe" });

    expect(result).toEqual({
      data: {
        position: "Engineer",
        documentId: "doc-1",
        status: "draft",
        createdAt: now,
        updatedAt: now,
        updatedBy: { documentId: "caller-1", name: "Jane Doe" },
      },
    });
  });

  it("passes through a null updatedBy as-is", () => {
    const result = toDocumentResponse(document, "draft", null);

    expect(result.data.updatedBy).toBeNull();
  });
});
