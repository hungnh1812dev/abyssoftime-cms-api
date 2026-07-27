import { ContentTypeEntity } from "../../../content-type/domain/entities/content-type.entity";

import { BadRequestException } from "@nestjs/common";

import { assertDraftPublishEnabled, resolveSaveVersion } from "./draft-publish.policy";

describe("draft-publish.policy", () => {
  function buildContentType(draftToPublish: boolean): ContentTypeEntity {
    return new ContentTypeEntity("ct-1", "cv-page", "CV Page", "collection", draftToPublish, [], [], new Date(), new Date());
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
});
