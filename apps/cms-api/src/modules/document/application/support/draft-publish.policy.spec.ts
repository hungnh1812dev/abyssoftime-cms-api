import { ContentTypeEntity } from "../../../content-type/domain/entities/content-type.entity";

import { BadRequestException } from "@nestjs/common";

import { assertDraftPublishEnabled, assertKind, resolveSaveVersion } from "./draft-publish.policy";

describe("draft-publish.policy", () => {
  function buildContentType(draftToPublish: boolean, kind: "single" | "collection" = "collection"): ContentTypeEntity {
    return new ContentTypeEntity("ct-1", "cv-page", "CV Page", kind, draftToPublish, [], [], new Date(), new Date());
  }

  describe("resolveSaveVersion", () => {
    it("returns draft for a draftToPublish: true content type (mode A)", () => {
      expect(resolveSaveVersion(buildContentType(true))).toBe("draft");
    });

    it("returns published for a draftToPublish: false content type (mode B)", () => {
      expect(resolveSaveVersion(buildContentType(false))).toBe("published");
    });
  });

  describe("assertDraftPublishEnabled", () => {
    it("does not throw for a draftToPublish: true content type (mode A)", () => {
      expect(() => assertDraftPublishEnabled(buildContentType(true))).not.toThrow();
    });

    it("throws BadRequestException for a draftToPublish: false content type (mode B)", () => {
      expect(() => assertDraftPublishEnabled(buildContentType(false))).toThrow(BadRequestException);
    });

    it("includes the slug in the mode B error message", () => {
      expect(() => assertDraftPublishEnabled(buildContentType(false))).toThrow(/cv-page/);
    });
  });

  describe("assertKind", () => {
    it("does not throw when the content type's kind matches", () => {
      expect(() => assertKind(buildContentType(true, "collection"), "collection")).not.toThrow();
      expect(() => assertKind(buildContentType(true, "single"), "single")).not.toThrow();
    });

    it("throws BadRequestException when a collection-kind content type is driven through single-type routes", () => {
      expect(() => assertKind(buildContentType(true, "collection"), "single")).toThrow(BadRequestException);
    });

    it("throws BadRequestException when a single-kind content type is driven through collection-type routes", () => {
      expect(() => assertKind(buildContentType(true, "single"), "collection")).toThrow(BadRequestException);
    });

    it("includes the slug and both kinds in the error message", () => {
      expect(() => assertKind(buildContentType(true, "single"), "collection")).toThrow(/cv-page/);
    });
  });
});
