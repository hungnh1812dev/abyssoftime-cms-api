import { BulkCreateAndPublishService } from "../application/services/bulk-create-publish.service";
import { BulkDeleteService } from "../application/services/bulk-delete.service";
import { DeleteDocumentService } from "../application/services/delete-document.service";
import { DuplicateDocumentService } from "../application/services/duplicate-document.service";
import { GetDocumentForEditService } from "../application/services/get-document-for-edit.service";
import { ListDocumentsService } from "../application/services/list-documents.service";
import { PublishDocumentService } from "../application/services/publish-document.service";
import { SaveDocumentService } from "../application/services/save-document.service";
import { UnpublishDocumentService } from "../application/services/unpublish-document.service";
import { DocumentEntity } from "../domain/entities/document.entity";

import { BadRequestException } from "@nestjs/common";
import { Test } from "@nestjs/testing";

import { JwtTokenService } from "@/common/token/jwt-token.service";
import { type AuthenticatedRequest } from "@/common/types/authenticated-request";
import { UserEntity } from "@/modules/users/domain/entities/user.entity";
import { type IUserRepository, USER_REPOSITORY } from "@/modules/users/domain/repositories/user.repository";

import { CollectionTypeDocumentController } from "./collection-type-document.controller";

describe("CollectionTypeDocumentController", () => {
  let controller: CollectionTypeDocumentController;
  let listDocuments: jest.Mocked<ListDocumentsService>;
  let saveDocument: jest.Mocked<SaveDocumentService>;
  let publishDocument: jest.Mocked<PublishDocumentService>;
  let unpublishDocument: jest.Mocked<UnpublishDocumentService>;
  let getDocumentForEdit: jest.Mocked<GetDocumentForEditService>;
  let deleteDocument: jest.Mocked<DeleteDocumentService>;
  let duplicateDocument: jest.Mocked<DuplicateDocumentService>;
  let bulkCreateAndPublish: jest.Mocked<BulkCreateAndPublishService>;
  let bulkDelete: jest.Mocked<BulkDeleteService>;
  let users: jest.Mocked<IUserRepository>;

  const now = new Date();
  const documentId = "11111111-1111-4111-8111-111111111111";
  const draft = new DocumentEntity(documentId, "draft", { position: "Engineer" }, now, now, null, "caller-1", "caller-1", null);
  const published = new DocumentEntity(documentId, "published", { position: "Engineer" }, now, now, now, "caller-1", "caller-1", "caller-1");
  const req = { user: { sub: "caller-1" } } as AuthenticatedRequest;
  const updatedByUser = new UserEntity("caller-1", "jane@example.com", "Jane Doe", "janedoe", "hash", true, true, null, now, now);

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      controllers: [CollectionTypeDocumentController],
      providers: [
        { provide: ListDocumentsService, useValue: { execute: jest.fn() } },
        { provide: SaveDocumentService, useValue: { execute: jest.fn() } },
        { provide: PublishDocumentService, useValue: { execute: jest.fn() } },
        { provide: UnpublishDocumentService, useValue: { execute: jest.fn() } },
        { provide: GetDocumentForEditService, useValue: { execute: jest.fn() } },
        { provide: DeleteDocumentService, useValue: { execute: jest.fn() } },
        { provide: DuplicateDocumentService, useValue: { execute: jest.fn() } },
        { provide: BulkCreateAndPublishService, useValue: { execute: jest.fn() } },
        { provide: BulkDeleteService, useValue: { execute: jest.fn() } },
        { provide: JwtTokenService, useValue: { verifyAccessToken: jest.fn() } },
        { provide: USER_REPOSITORY, useValue: { findById: jest.fn() } },
      ],
    }).compile();

    controller = module.get(CollectionTypeDocumentController);
    listDocuments = module.get(ListDocumentsService);
    saveDocument = module.get(SaveDocumentService);
    publishDocument = module.get(PublishDocumentService);
    unpublishDocument = module.get(UnpublishDocumentService);
    getDocumentForEdit = module.get(GetDocumentForEditService);
    deleteDocument = module.get(DeleteDocumentService);
    duplicateDocument = module.get(DuplicateDocumentService);
    bulkCreateAndPublish = module.get(BulkCreateAndPublishService);
    bulkDelete = module.get(BulkDeleteService);
    users = module.get(USER_REPOSITORY);
    users.findById.mockResolvedValue(updatedByUser);
  });

  describe("list()", () => {
    it("delegates to ListDocumentsService with the parsed query", async () => {
      const listResult = { items: [], total: 0, start: 0, size: 20 };
      listDocuments.execute.mockResolvedValue(listResult);

      const result = await controller.list("cv-page", { search: "eng" });

      expect(listDocuments.execute).toHaveBeenCalledWith("cv-page", { search: "eng" });
      expect(result).toBe(listResult);
    });

    it("throws BadRequestException for an invalid slug, without touching the service", async () => {
      await expect(controller.list("Bad Slug!", {})).rejects.toThrow(BadRequestException);
      expect(listDocuments.execute).not.toHaveBeenCalled();
    });
  });

  describe("bulkCreate()", () => {
    it("delegates to BulkCreateAndPublishService and maps every result to a published document response", async () => {
      bulkCreateAndPublish.execute.mockResolvedValue([published]);

      const result = await controller.bulkCreate("cv-page", { items: [{ data: { position: "Engineer" } }] }, req);

      expect(bulkCreateAndPublish.execute).toHaveBeenCalledWith("cv-page", [{ position: "Engineer" }], "caller-1");
      expect(result).toEqual({
        items: [{ data: { documentId, status: "published", createdAt: now, updatedAt: now, position: "Engineer", updatedBy: { documentId: "caller-1", name: "Jane Doe" } } }],
      });
    });

    it("throws BadRequestException for an invalid slug, without touching the service", async () => {
      await expect(controller.bulkCreate("Bad Slug!", { items: [{ data: {} }] }, req)).rejects.toThrow(BadRequestException);
      expect(bulkCreateAndPublish.execute).not.toHaveBeenCalled();
    });
  });

  describe("bulkDelete()", () => {
    it("splits BulkDeleteService results into deleted/failed", async () => {
      bulkDelete.execute.mockResolvedValue([{ documentId: "id-1" }, { documentId: "id-2", error: "not found" }]);

      const result = await controller.bulkDelete("cv-page", { documentIds: ["id-1", "id-2"] });

      expect(bulkDelete.execute).toHaveBeenCalledWith("cv-page", ["id-1", "id-2"]);
      expect(result).toEqual({ deleted: ["id-1"], failed: [{ documentId: "id-2", error: "not found" }] });
    });

    it("throws BadRequestException for an invalid slug, without touching the service", async () => {
      await expect(controller.bulkDelete("Bad Slug!", { documentIds: ["id-1"] })).rejects.toThrow(BadRequestException);
      expect(bulkDelete.execute).not.toHaveBeenCalled();
    });
  });

  describe("create()", () => {
    it("saves a fresh document and derives status straight from the returned version (no re-read)", async () => {
      saveDocument.execute.mockResolvedValue(draft);

      const result = await controller.create("cv-page", { data: { position: "Engineer" } }, req);

      expect(saveDocument.execute).toHaveBeenCalledWith("cv-page", { position: "Engineer" }, undefined, "caller-1");
      expect(getDocumentForEdit.execute).not.toHaveBeenCalled();
      expect(result).toEqual({
        data: { documentId, status: "draft", createdAt: now, updatedAt: now, position: "Engineer", updatedBy: { documentId: "caller-1", name: "Jane Doe" } },
      });
    });

    it("throws BadRequestException for an invalid slug, without touching the service", async () => {
      await expect(controller.create("Bad Slug!", { data: {} }, req)).rejects.toThrow(BadRequestException);
      expect(saveDocument.execute).not.toHaveBeenCalled();
    });
  });

  describe("get()", () => {
    it("delegates to GetDocumentForEditService and maps the response", async () => {
      getDocumentForEdit.execute.mockResolvedValue({ document: draft, status: "draft" });

      const result = await controller.get("cv-page", documentId);

      expect(getDocumentForEdit.execute).toHaveBeenCalledWith("cv-page", documentId);
      expect(result).toEqual({
        data: { documentId, status: "draft", createdAt: now, updatedAt: now, position: "Engineer", updatedBy: { documentId: "caller-1", name: "Jane Doe" } },
      });
    });

    it("resolves updatedBy to null when the document has no updatedBy id", async () => {
      const noUpdatedBy = new DocumentEntity(documentId, "draft", { position: "Engineer" }, now, now, null, null, null, null);
      getDocumentForEdit.execute.mockResolvedValue({ document: noUpdatedBy, status: "draft" });

      const result = await controller.get("cv-page", documentId);

      expect(users.findById).not.toHaveBeenCalled();
      expect(result.data.updatedBy).toBeNull();
    });

    it("throws BadRequestException for an invalid documentId, without touching the service", async () => {
      await expect(controller.get("cv-page", "not-a-uuid")).rejects.toThrow(BadRequestException);
      expect(getDocumentForEdit.execute).not.toHaveBeenCalled();
    });
  });

  describe("update()", () => {
    it("saves then re-reads to get the correct draft/modified status", async () => {
      saveDocument.execute.mockResolvedValue(draft);
      getDocumentForEdit.execute.mockResolvedValue({ document: draft, status: "modified" });

      const result = await controller.update("cv-page", documentId, { data: { position: "Engineer" } }, req);

      expect(saveDocument.execute).toHaveBeenCalledWith("cv-page", { position: "Engineer" }, documentId, "caller-1");
      expect(getDocumentForEdit.execute).toHaveBeenCalledWith("cv-page", documentId);
      expect(result.data.status).toBe("modified");
      expect(result.data.updatedBy).toEqual({ documentId: "caller-1", name: "Jane Doe" });
    });

    it("throws BadRequestException for an invalid documentId, without touching any service", async () => {
      await expect(controller.update("cv-page", "not-a-uuid", { data: {} }, req)).rejects.toThrow(BadRequestException);
      expect(saveDocument.execute).not.toHaveBeenCalled();
      expect(getDocumentForEdit.execute).not.toHaveBeenCalled();
    });
  });

  describe("delete()", () => {
    it("delegates to DeleteDocumentService", async () => {
      deleteDocument.execute.mockResolvedValue(undefined);

      await controller.delete("cv-page", documentId);

      expect(deleteDocument.execute).toHaveBeenCalledWith("cv-page", documentId);
    });

    it("throws BadRequestException for an invalid documentId, without touching the service", async () => {
      await expect(controller.delete("cv-page", "not-a-uuid")).rejects.toThrow(BadRequestException);
      expect(deleteDocument.execute).not.toHaveBeenCalled();
    });
  });

  describe("publish()", () => {
    it("delegates to PublishDocumentService and returns a fixed published status", async () => {
      publishDocument.execute.mockResolvedValue(published);

      const result = await controller.publish("cv-page", documentId, req);

      expect(publishDocument.execute).toHaveBeenCalledWith("cv-page", documentId, "caller-1");
      expect(result).toEqual({ status: "published" });
    });

    it("throws BadRequestException for an invalid documentId, without touching the service", async () => {
      await expect(controller.publish("cv-page", "not-a-uuid", req)).rejects.toThrow(BadRequestException);
      expect(publishDocument.execute).not.toHaveBeenCalled();
    });
  });

  describe("unpublish()", () => {
    it("delegates to UnpublishDocumentService and returns a fixed draft status", async () => {
      unpublishDocument.execute.mockResolvedValue(undefined);

      const result = await controller.unpublish("cv-page", documentId);

      expect(unpublishDocument.execute).toHaveBeenCalledWith("cv-page", documentId);
      expect(result).toEqual({ status: "draft" });
    });

    it("throws BadRequestException for an invalid documentId, without touching the service", async () => {
      await expect(controller.unpublish("cv-page", "not-a-uuid")).rejects.toThrow(BadRequestException);
      expect(unpublishDocument.execute).not.toHaveBeenCalled();
    });
  });

  describe("duplicate()", () => {
    it("duplicates and derives status straight from the returned version (no re-read)", async () => {
      const newDocumentId = "22222222-2222-4222-8222-222222222222";
      const duplicate = new DocumentEntity(newDocumentId, "draft", { position: "Engineer" }, now, now, null, "caller-1", "caller-1", null);
      duplicateDocument.execute.mockResolvedValue(duplicate);

      const result = await controller.duplicate("cv-page", documentId, req);

      expect(duplicateDocument.execute).toHaveBeenCalledWith("cv-page", documentId, "caller-1");
      expect(getDocumentForEdit.execute).not.toHaveBeenCalled();
      expect(result).toEqual({
        data: { documentId: newDocumentId, status: "draft", createdAt: now, updatedAt: now, position: "Engineer", updatedBy: { documentId: "caller-1", name: "Jane Doe" } },
      });
    });

    it("throws BadRequestException for an invalid documentId, without touching the service", async () => {
      await expect(controller.duplicate("cv-page", "not-a-uuid", req)).rejects.toThrow(BadRequestException);
      expect(duplicateDocument.execute).not.toHaveBeenCalled();
    });
  });
});
