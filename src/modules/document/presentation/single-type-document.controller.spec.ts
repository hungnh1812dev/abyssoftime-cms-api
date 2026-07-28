import { GetSingleTypeService } from "../application/services/get-single-type.service";
import { PublishSingleTypeService } from "../application/services/publish-single-type.service";
import { SaveSingleTypeService } from "../application/services/save-single-type.service";
import { UnpublishSingleTypeService } from "../application/services/unpublish-single-type.service";
import { DocumentEntity } from "../domain/entities/document.entity";

import { BadRequestException } from "@nestjs/common";
import { Test } from "@nestjs/testing";

import { JwtTokenService } from "@/common/token/jwt-token.service";
import { type AuthenticatedRequest } from "@/common/types/authenticated-request";
import { UserEntity } from "@/modules/users/domain/entities/user.entity";
import { type IUserRepository, USER_REPOSITORY } from "@/modules/users/domain/repositories/user.repository";

import { SingleTypeDocumentController } from "./single-type-document.controller";

describe("SingleTypeDocumentController", () => {
  let controller: SingleTypeDocumentController;
  let getSingleType: jest.Mocked<GetSingleTypeService>;
  let saveSingleType: jest.Mocked<SaveSingleTypeService>;
  let publishSingleType: jest.Mocked<PublishSingleTypeService>;
  let unpublishSingleType: jest.Mocked<UnpublishSingleTypeService>;
  let users: jest.Mocked<IUserRepository>;

  const now = new Date();
  const document = new DocumentEntity("doc-1", "draft", { position: "Engineer" }, now, now, null, "caller-1", "caller-1", null);
  const req = { user: { sub: "caller-1" } } as AuthenticatedRequest;
  const updatedByUser = new UserEntity("caller-1", "jane@example.com", "Jane Doe", "janedoe", "hash", true, true, null, now, now);

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      controllers: [SingleTypeDocumentController],
      providers: [
        { provide: GetSingleTypeService, useValue: { execute: jest.fn() } },
        { provide: SaveSingleTypeService, useValue: { execute: jest.fn() } },
        { provide: PublishSingleTypeService, useValue: { execute: jest.fn() } },
        { provide: UnpublishSingleTypeService, useValue: { execute: jest.fn() } },
        { provide: JwtTokenService, useValue: { verifyAccessToken: jest.fn() } },
        { provide: USER_REPOSITORY, useValue: { findById: jest.fn() } },
      ],
    }).compile();

    controller = module.get(SingleTypeDocumentController);
    getSingleType = module.get(GetSingleTypeService);
    saveSingleType = module.get(SaveSingleTypeService);
    publishSingleType = module.get(PublishSingleTypeService);
    unpublishSingleType = module.get(UnpublishSingleTypeService);
    users = module.get(USER_REPOSITORY);
    users.findById.mockResolvedValue(updatedByUser);
  });

  describe("get()", () => {
    it("returns the flat document response for a valid slug, with updatedBy resolved", async () => {
      getSingleType.execute.mockResolvedValue({ document, status: "draft" });

      const result = await controller.get("cv-page");

      expect(getSingleType.execute).toHaveBeenCalledWith("cv-page");
      expect(users.findById).toHaveBeenCalledWith("caller-1");
      expect(result).toEqual({
        data: { documentId: "doc-1", status: "draft", createdAt: now, updatedAt: now, position: "Engineer", updatedBy: { documentId: "caller-1", name: "Jane Doe" } },
      });
    });

    it("resolves updatedBy to null when the document has no updatedBy id", async () => {
      const noUpdatedBy = new DocumentEntity("doc-1", "draft", { position: "Engineer" }, now, now, null, null, null, null);
      getSingleType.execute.mockResolvedValue({ document: noUpdatedBy, status: "draft" });

      const result = await controller.get("cv-page");

      expect(users.findById).not.toHaveBeenCalled();
      expect(result.data.updatedBy).toBeNull();
    });

    it("resolves updatedBy to null when the id is dangling (user not found)", async () => {
      users.findById.mockResolvedValue(null);
      getSingleType.execute.mockResolvedValue({ document, status: "draft" });

      const result = await controller.get("cv-page");

      expect(result.data.updatedBy).toBeNull();
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
      expect(result.data.updatedBy).toEqual({ documentId: "caller-1", name: "Jane Doe" });
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
