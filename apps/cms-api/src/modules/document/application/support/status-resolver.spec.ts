import { DocumentEntity } from "../../domain/entities/document.entity";

import { resolveBatchStatuses, resolveStatus } from "./status-resolver";

describe("status-resolver", () => {
  function buildDocument(documentId: string, updatedAt: Date): DocumentEntity {
    return new DocumentEntity(documentId, "draft", {}, updatedAt, updatedAt, null, null, null, null);
  }

  describe("resolveStatus", () => {
    it("short-circuits to published for a draftToPublish: false content type, ignoring timestamps", () => {
      expect(resolveStatus(false, new Date("2026-01-02"), new Date("2026-01-01"))).toBe("published");
      expect(resolveStatus(false, new Date("2026-01-01"), null)).toBe("published");
    });

    it("returns draft when no published row exists (mode A)", () => {
      expect(resolveStatus(true, new Date("2026-01-01"), null)).toBe("draft");
    });

    it("returns modified when the draft was updated after the published row (mode A)", () => {
      expect(resolveStatus(true, new Date("2026-01-02"), new Date("2026-01-01"))).toBe("modified");
    });

    it("returns published when the draft is not newer than the published row (mode A)", () => {
      expect(resolveStatus(true, new Date("2026-01-01"), new Date("2026-01-01"))).toBe("published");
      expect(resolveStatus(true, new Date("2026-01-01"), new Date("2026-01-02"))).toBe("published");
    });
  });

  describe("resolveBatchStatuses", () => {
    it("computes a status per documentId in one pass, no per-item lookups (mode A)", () => {
      const drafts = [buildDocument("doc-1", new Date("2026-01-03")), buildDocument("doc-2", new Date("2026-01-01")), buildDocument("doc-3", new Date("2026-01-01"))];
      const published = [buildDocument("doc-1", new Date("2026-01-01")), buildDocument("doc-2", new Date("2026-01-01"))];

      const statuses = resolveBatchStatuses(true, drafts, published);

      expect(statuses.get("doc-1")).toBe("modified");
      expect(statuses.get("doc-2")).toBe("published");
      expect(statuses.get("doc-3")).toBe("draft");
    });

    it("returns published for every documentId for a draftToPublish: false content type", () => {
      const drafts = [buildDocument("doc-1", new Date("2026-01-01"))];

      const statuses = resolveBatchStatuses(false, drafts, []);

      expect(statuses.get("doc-1")).toBe("published");
    });
  });
});
