import { MediaAssetEntity } from "../../domain/entities/media-asset.entity";
import { IMediaAssetRepository, MediaAssetNotFoundError } from "../../domain/repositories/media-asset.repository";

import { NotFoundException } from "@nestjs/common";

import { StorageAdapter } from "@/modules/storage/domain/repositories/storage-adapter.repository";

import { DeleteMediaService } from "./delete-media.service";

describe("DeleteMediaService", () => {
  let service: DeleteMediaService;
  let mediaAssets: jest.Mocked<IMediaAssetRepository>;
  let storage: jest.Mocked<StorageAdapter>;

  const existing = new MediaAssetEntity(
    "media-1",
    "photo.png",
    "image/png",
    100,
    800,
    600,
    "https://cdn.example.com/photo.png",
    "https://cdn.example.com/photo.png",
    "photo-public-id",
    "hash",
    "user-1",
    new Date(),
    new Date(),
  );

  beforeEach(() => {
    mediaAssets = {
      create: jest.fn(),
      findById: jest.fn(),
      findByDocumentIds: jest.fn(),
      findAll: jest.fn(),
      delete: jest.fn(),
    };
    storage = {
      upload: jest.fn(),
      delete: jest.fn(),
    };

    service = new DeleteMediaService(mediaAssets, storage);
  });

  it("throws NotFoundException when the target media asset does not exist", async () => {
    mediaAssets.findById.mockResolvedValue(null);

    await expect(service.execute("missing")).rejects.toThrow(NotFoundException);
    expect(storage.delete).not.toHaveBeenCalled();
    expect(mediaAssets.delete).not.toHaveBeenCalled();
  });

  it("lets a storage-delete failure propagate uncaught, without deleting the DB row", async () => {
    mediaAssets.findById.mockResolvedValue(existing);
    const storageError = new Error("storage unavailable");
    storage.delete.mockRejectedValue(storageError);

    await expect(service.execute("media-1")).rejects.toThrow(storageError);
    expect(mediaAssets.delete).not.toHaveBeenCalled();
  });

  it("translates MediaAssetNotFoundError from the repository into NotFoundException", async () => {
    mediaAssets.findById.mockResolvedValue(existing);
    storage.delete.mockResolvedValue(undefined);
    mediaAssets.delete.mockRejectedValue(new MediaAssetNotFoundError("media-1"));

    await expect(service.execute("media-1")).rejects.toThrow(NotFoundException);
  });

  it("rethrows unexpected errors from the repository delete", async () => {
    mediaAssets.findById.mockResolvedValue(existing);
    storage.delete.mockResolvedValue(undefined);
    const unexpected = new Error("db down");
    mediaAssets.delete.mockRejectedValue(unexpected);

    await expect(service.execute("media-1")).rejects.toThrow(unexpected);
  });

  it("deletes storage by publicId, then the DB row by documentId (happy path)", async () => {
    mediaAssets.findById.mockResolvedValue(existing);
    storage.delete.mockResolvedValue(undefined);
    mediaAssets.delete.mockResolvedValue(undefined);

    await service.execute("media-1");

    expect(storage.delete).toHaveBeenCalledWith("photo-public-id");
    expect(mediaAssets.delete).toHaveBeenCalledWith("media-1");
  });
});
