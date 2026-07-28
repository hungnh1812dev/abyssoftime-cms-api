import { GetPublicDocumentService } from "../application/services/get-public-document.service";
import { GetPublicSingleTypeService } from "../application/services/get-public-single-type.service";
import { DocumentEntity } from "../domain/entities/document.entity";

import { BadRequestException } from "@nestjs/common";
import { Test } from "@nestjs/testing";

import { PublicDocumentController } from "./public-document.controller";

describe("PublicDocumentController", () => {
  let controller: PublicDocumentController;
  let getPublicDocument: jest.Mocked<GetPublicDocumentService>;
  let getPublicSingleType: jest.Mocked<GetPublicSingleTypeService>;

  const now = new Date();
  const documentId = "11111111-1111-4111-8111-111111111111";
  const published = new DocumentEntity(documentId, "published", { position: "Engineer" }, now, now, now, "caller-1", "caller-1", "caller-1");

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      controllers: [PublicDocumentController],
      providers: [
        { provide: GetPublicDocumentService, useValue: { execute: jest.fn() } },
        { provide: GetPublicSingleTypeService, useValue: { execute: jest.fn() } },
      ],
    }).compile();

    controller = module.get(PublicDocumentController);
    getPublicDocument = module.get(GetPublicDocumentService);
    getPublicSingleType = module.get(GetPublicSingleTypeService);
  });

  describe("getCollectionType()", () => {
    it("delegates to GetPublicDocumentService and returns a fixed published status", async () => {
      getPublicDocument.execute.mockResolvedValue(published);

      const result = await controller.getCollectionType("cv-page", documentId);

      expect(getPublicDocument.execute).toHaveBeenCalledWith("cv-page", documentId);
      expect(result).toEqual({ data: { documentId, status: "published", createdAt: now, updatedAt: now, position: "Engineer" } });
    });

    it("throws BadRequestException for an invalid slug, without touching the service", async () => {
      await expect(controller.getCollectionType("Bad Slug!", documentId)).rejects.toThrow(BadRequestException);
      expect(getPublicDocument.execute).not.toHaveBeenCalled();
    });

    it("throws BadRequestException for an invalid documentId, without touching the service", async () => {
      await expect(controller.getCollectionType("cv-page", "not-a-uuid")).rejects.toThrow(BadRequestException);
      expect(getPublicDocument.execute).not.toHaveBeenCalled();
    });
  });

  describe("getSingleType()", () => {
    it("delegates to GetPublicSingleTypeService and returns a fixed published status", async () => {
      getPublicSingleType.execute.mockResolvedValue(published);

      const result = await controller.getSingleType("cv-page");

      expect(getPublicSingleType.execute).toHaveBeenCalledWith("cv-page");
      expect(result).toEqual({ data: { documentId, status: "published", createdAt: now, updatedAt: now, position: "Engineer" } });
    });

    it("throws BadRequestException for an invalid slug, without touching the service", async () => {
      await expect(controller.getSingleType("Bad Slug!")).rejects.toThrow(BadRequestException);
      expect(getPublicSingleType.execute).not.toHaveBeenCalled();
    });
  });
});
