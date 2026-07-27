import { MediaAssetEntity } from "../../domain/entities/media-asset.entity";
import { IMediaAssetRepository } from "../../domain/repositories/media-asset.repository";
import { createHash } from "node:crypto";

import { PayloadTooLargeException, UnprocessableEntityException } from "@nestjs/common";
import { type ConfigService } from "@nestjs/config";

import { type EnvironmentVariables } from "@/config/env.validation";
import { StorageAdapter } from "@/modules/storage/domain/repositories/storage-adapter.repository";

import { UploadMediaService } from "./upload-media.service";

function buildPngBuffer(width: number, height: number): Buffer {
  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const length = Buffer.alloc(4);
  length.writeUInt32BE(13, 0);
  const chunkType = Buffer.from("IHDR", "ascii");
  const widthBuf = Buffer.alloc(4);
  widthBuf.writeUInt32BE(width, 0);
  const heightBuf = Buffer.alloc(4);
  heightBuf.writeUInt32BE(height, 0);
  const rest = Buffer.from([0x08, 0x02, 0x00, 0x00, 0x00]);
  return Buffer.concat([signature, length, chunkType, widthBuf, heightBuf, rest]);
}

describe("UploadMediaService", () => {
  let service: UploadMediaService;
  let mediaAssets: jest.Mocked<IMediaAssetRepository>;
  let storage: jest.Mocked<StorageAdapter>;
  let configService: { get: jest.Mock };

  const created = new MediaAssetEntity(
    "media-1",
    "photo.png",
    "image/png",
    100,
    800,
    600,
    "https://cdn.example.com/photo.png",
    "https://cdn.example.com/photo.png",
    "photo",
    "hash",
    "user-1",
    new Date(),
    new Date(),
  );

  beforeEach(() => {
    mediaAssets = {
      create: jest.fn(),
      findById: jest.fn(),
      findByDocumentId: jest.fn(),
      findAll: jest.fn(),
      delete: jest.fn(),
    };
    storage = {
      upload: jest.fn(),
      delete: jest.fn(),
    };
    configService = {
      get: jest.fn((key: string) => {
        if (key === "MEDIA_MAX_UPLOAD_BYTES") return 1024;
        throw new Error(`unexpected config key "${key}"`);
      }),
    };

    service = new UploadMediaService(mediaAssets, storage, configService as unknown as ConfigService<EnvironmentVariables, true>);
  });

  it("throws PayloadTooLargeException when the buffer exceeds MEDIA_MAX_UPLOAD_BYTES, without touching storage or the repository", async () => {
    const buffer = Buffer.alloc(2048);

    await expect(service.execute({ buffer, fileName: "big.png", mimeType: "image/png", uploadedBy: "user-1" })).rejects.toThrow(PayloadTooLargeException);

    expect(storage.upload).not.toHaveBeenCalled();
    expect(mediaAssets.create).not.toHaveBeenCalled();
  });

  it("throws UnprocessableEntityException for a non-image buffer, without touching storage or the repository", async () => {
    const buffer = Buffer.from("just some plain text bytes");

    await expect(service.execute({ buffer, fileName: "not-an-image.txt", mimeType: "text/plain", uploadedBy: "user-1" })).rejects.toThrow(UnprocessableEntityException);

    expect(storage.upload).not.toHaveBeenCalled();
    expect(mediaAssets.create).not.toHaveBeenCalled();
  });

  it("uploads to storage, hashes the buffer, and persists the resulting metadata", async () => {
    const buffer = buildPngBuffer(800, 600);
    const expectedHash = createHash("sha256").update(buffer).digest("hex");

    storage.upload.mockResolvedValue({ url: "https://cdn.example.com/photo.png", thumbnailUrl: "https://cdn.example.com/photo.png", publicId: "photo" });
    mediaAssets.create.mockResolvedValue(created);

    const result = await service.execute({ buffer, fileName: "photo.png", mimeType: "image/png", uploadedBy: "user-1" });

    expect(storage.upload).toHaveBeenCalledWith({ buffer, fileName: "photo.png", mimeType: "image/png" });
    expect(mediaAssets.create).toHaveBeenCalledWith({
      fileName: "photo.png",
      mimeType: "image/png",
      size: buffer.length,
      width: 800,
      height: 600,
      url: "https://cdn.example.com/photo.png",
      thumbnailUrl: "https://cdn.example.com/photo.png",
      publicId: "photo",
      hash: expectedHash,
      uploadedBy: "user-1",
    });
    expect(result).toBe(created);
  });

  it("uploads to storage before persisting metadata", async () => {
    const buffer = buildPngBuffer(800, 600);
    const callOrder: string[] = [];
    storage.upload.mockImplementation(() => {
      callOrder.push("upload");
      return Promise.resolve({ url: "u", thumbnailUrl: "t", publicId: "p" });
    });
    mediaAssets.create.mockImplementation(() => {
      callOrder.push("create");
      return Promise.resolve(created);
    });

    await service.execute({ buffer, fileName: "photo.png", mimeType: "image/png", uploadedBy: "user-1" });

    expect(callOrder).toEqual(["upload", "create"]);
  });

  it("ignores a spoofed mimeType/extension and uses the detected image format for storage and persistence", async () => {
    const buffer = buildPngBuffer(800, 600);
    storage.upload.mockResolvedValue({ url: "u", thumbnailUrl: "t", publicId: "p" });
    mediaAssets.create.mockResolvedValue(created);

    await service.execute({ buffer, fileName: "photo.html", mimeType: "text/html", uploadedBy: "user-1" });

    expect(storage.upload).toHaveBeenCalledWith({ buffer, fileName: "photo.png", mimeType: "image/png" });
    expect(mediaAssets.create).toHaveBeenCalledWith(expect.objectContaining({ fileName: "photo.html", mimeType: "image/png" }));
  });

  it("passes uploadedBy: null through when no uploader is known", async () => {
    const buffer = buildPngBuffer(800, 600);
    storage.upload.mockResolvedValue({ url: "u", thumbnailUrl: "t", publicId: "p" });
    mediaAssets.create.mockResolvedValue(created);

    await service.execute({ buffer, fileName: "photo.png", mimeType: "image/png", uploadedBy: null });

    expect(mediaAssets.create).toHaveBeenCalledWith(expect.objectContaining({ uploadedBy: null }));
  });
});
