import { GetSingleTypeService } from "../application/services/get-single-type.service";
import { PublishSingleTypeService } from "../application/services/publish-single-type.service";
import { SaveSingleTypeService } from "../application/services/save-single-type.service";
import { UnpublishSingleTypeService } from "../application/services/unpublish-single-type.service";
import { DocumentEntity } from "../domain/entities/document.entity";

import { BadRequestException } from "@nestjs/common";
import { Test } from "@nestjs/testing";

import { JwtTokenService } from "@/common/token/jwt-token.service";
import { type AuthenticatedRequest } from "@/common/types/authenticated-request";

import { SingleTypeDocumentController } from "./single-type-document.controller";

describe("SingleTypeDocumentController", () => {
  let controller: SingleTypeDocumentController;
  let getSingleType: jest.Mocked<GetSingleTypeService>;
  let saveSingleType: jest.Mocked<SaveSingleTypeService>;
  let publishSingleType: jest.Mocked<PublishSingleTypeService>;
  let unpublishSingleType: jest.Mocked<UnpublishSingleTypeService>;

  const now = new Date();
  const document = new DocumentEntity("doc-1", "draft", { position: "Engineer" }, now, now, null, "caller-1", "caller-1", null);
  const req = { user: { sub: "caller-1" } } as AuthenticatedRequest;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      controllers: [SingleTypeDocumentController],
      providers: [
        { provide: GetSingleTypeService, useValue: { execute: jest.fn() } },
        { provide: SaveSingleTypeService, useValue: { execute: jest.fn() } },
        { provide: PublishSingleTypeService, useValue: { execute: jest.fn() } },
        { provide: UnpublishSingleTypeService, useValue: { execute: jest.fn() } },
        { provide: JwtTokenService, useValue: { verifyAccessToken: jest.fn() } },
      ],
    }).compile();

    controller = module.get(SingleTypeDocumentController);
    getSingleType = module.get(GetSingleTypeService);
    saveSingleType = module.get(SaveSingleTypeService);
    publishSingleType = module.get(PublishSingleTypeService);
    unpublishSingleType = module.get(UnpublishSingleTypeService);
  });

  describe("get()", () => {
    it("returns the flat document response for a valid slug", async () => {
      getSingleType.execute.mockResolvedValue({ document, status: "draft" });

      const result = await controller.get("cv-page");

      expect(getSingleType.execute).toHaveBeenCalledWith("cv-page");
      expect(result).toEqual({
        data: { documentId: "doc-1", status: "draft", createdAt: now, updatedAt: now, position: "Engineer" },
      });
    });

    it("throws BadRequestException for an invalid slug, without touching the service", async () => {
      await expect(controller.get("Bad Slug!")).rejects.toThrow(BadRequestException);
      expect(getSingleType.execute).not.toHaveBeenCalled();
    });
  });

  describe("save()", () => {
    it("saves then re-reads to return the computed status", async () => {
      saveSingleType.execute.mockResolvedValue(document);
      getSingleType.execute.mockResolvedValue({ document, status: "modified" });

      const result = await controller.save("cv-page", { data: { position: "Engineer" } }, req);

      expect(saveSingleType.execute).toHaveBeenCalledWith("cv-page", { position: "Engineer" }, "caller-1");
      expect(getSingleType.execute).toHaveBeenCalledWith("cv-page");
      expect(result.data.status).toBe("modified");
    });

    it("throws BadRequestException for an invalid slug, without touching any service", async () => {
      await expect(controller.save("Bad Slug!", { data: {} }, req)).rejects.toThrow(BadRequestException);
      expect(saveSingleType.execute).not.toHaveBeenCalled();
      expect(getSingleType.execute).not.toHaveBeenCalled();
    });
  });

  describe("publish()", () => {
    it("delegates to PublishSingleTypeService and returns a fixed published status", async () => {
      publishSingleType.execute.mockResolvedValue(document);

      const result = await controller.publish("cv-page", req);

      expect(publishSingleType.execute).toHaveBeenCalledWith("cv-page", "caller-1");
      expect(result).toEqual({ status: "published" });
    });

    it("throws BadRequestException for an invalid slug, without touching the service", async () => {
      await expect(controller.publish("Bad Slug!", req)).rejects.toThrow(BadRequestException);
      expect(publishSingleType.execute).not.toHaveBeenCalled();
    });
  });

  describe("unpublish()", () => {
    it("delegates to UnpublishSingleTypeService and returns a fixed draft status", async () => {
      unpublishSingleType.execute.mockResolvedValue(undefined);

      const result = await controller.unpublish("cv-page");

      expect(unpublishSingleType.execute).toHaveBeenCalledWith("cv-page");
      expect(result).toEqual({ status: "draft" });
    });

    it("throws BadRequestException for an invalid slug, without touching the service", async () => {
      await expect(controller.unpublish("Bad Slug!")).rejects.toThrow(BadRequestException);
      expect(unpublishSingleType.execute).not.toHaveBeenCalled();
    });
  });
});
