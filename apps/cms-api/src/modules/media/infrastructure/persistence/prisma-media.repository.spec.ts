import { MediaAssetNotFoundError } from "../../domain/repositories/media-asset.repository";

import { Prisma } from "@/prisma/application/client";
import { PrismaService } from "@/prisma/application/prisma.service";

import { PrismaMediaRepository } from "./prisma-media.repository";

describe("PrismaMediaRepository", () => {
  let repository: PrismaMediaRepository;
  let prisma: {
    mediaAsset: {
      findMany: jest.Mock;
      findUnique: jest.Mock;
      create: jest.Mock;
      delete: jest.Mock;
    };
  };

  const record = {
    documentId: "media-1",
    fileName: "photo.png",
    mimeType: "image/png",
    size: 1024,
    width: 800,
    height: 600,
    url: "https://cdn.example.com/photo.png",
    thumbnailUrl: "https://cdn.example.com/photo.png",
    publicId: "photo",
    hash: "abc123",
    uploadedBy: "user-1",
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-01-02T00:00:00.000Z"),
  };

  beforeEach(() => {
    prisma = {
      mediaAsset: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        delete: jest.fn(),
      },
    };

    repository = new PrismaMediaRepository(prisma as unknown as PrismaService);
  });

  const expectMappedEntity = (entity: {
    documentId: string;
    fileName: string;
    mimeType: string;
    size: number;
    width: number;
    height: number;
    url: string;
    thumbnailUrl: string;
    publicId: string;
    hash: string;
    uploadedBy: string | null;
    createdAt: Date;
    updatedAt: Date;
  }) => {
    expect(entity).toEqual({
      documentId: record.documentId,
      fileName: record.fileName,
      mimeType: record.mimeType,
      size: record.size,
      width: record.width,
      height: record.height,
      url: record.url,
      thumbnailUrl: record.thumbnailUrl,
      publicId: record.publicId,
      hash: record.hash,
      uploadedBy: record.uploadedBy,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    });
  };

  const knownRequestError = (code: string) => new Prisma.PrismaClientKnownRequestError("boom", { code, clientVersion: "test" });

  it("findAll() maps every record to a MediaAssetEntity ordered by createdAt desc", async () => {
    prisma.mediaAsset.findMany.mockResolvedValue([record]);

    const result = await repository.findAll();

    expect(prisma.mediaAsset.findMany).toHaveBeenCalledWith({ orderBy: { createdAt: "desc" } });
    expect(result).toHaveLength(1);
    expectMappedEntity(result[0]);
  });

  it("findById() looks up by documentId via findUnique", async () => {
    prisma.mediaAsset.findUnique.mockResolvedValue(record);

    const result = await repository.findById("media-1");

    expect(prisma.mediaAsset.findUnique).toHaveBeenCalledWith({ where: { documentId: "media-1" } });
    expectMappedEntity(result!);
  });

  it("findById() returns null when no record is found", async () => {
    prisma.mediaAsset.findUnique.mockResolvedValue(null);

    const result = await repository.findById("missing");

    expect(result).toBeNull();
  });

  it("findByDocumentId() looks up by documentId via findUnique", async () => {
    prisma.mediaAsset.findUnique.mockResolvedValue(record);

    const result = await repository.findByDocumentId("media-1");

    expect(prisma.mediaAsset.findUnique).toHaveBeenCalledWith({ where: { documentId: "media-1" } });
    expectMappedEntity(result!);
  });

  it("findByDocumentId() returns null when no record is found", async () => {
    prisma.mediaAsset.findUnique.mockResolvedValue(null);

    const result = await repository.findByDocumentId("missing");

    expect(result).toBeNull();
  });

  it("create() passes all fields through to prisma and maps the result", async () => {
    prisma.mediaAsset.create.mockResolvedValue(record);

    const result = await repository.create({
      fileName: "photo.png",
      mimeType: "image/png",
      size: 1024,
      width: 800,
      height: 600,
      url: "https://cdn.example.com/photo.png",
      thumbnailUrl: "https://cdn.example.com/photo.png",
      publicId: "photo",
      hash: "abc123",
      uploadedBy: "user-1",
    });

    expect(prisma.mediaAsset.create).toHaveBeenCalledWith({
      data: {
        fileName: "photo.png",
        mimeType: "image/png",
        size: 1024,
        width: 800,
        height: 600,
        url: "https://cdn.example.com/photo.png",
        thumbnailUrl: "https://cdn.example.com/photo.png",
        publicId: "photo",
        hash: "abc123",
        uploadedBy: "user-1",
      },
    });
    expectMappedEntity(result);
  });

  it("create() accepts uploadedBy: null and passes it through to prisma", async () => {
    prisma.mediaAsset.create.mockResolvedValue({ ...record, uploadedBy: null });

    const result = await repository.create({
      fileName: "photo.png",
      mimeType: "image/png",
      size: 1024,
      width: 800,
      height: 600,
      url: "https://cdn.example.com/photo.png",
      thumbnailUrl: "https://cdn.example.com/photo.png",
      publicId: "photo",
      hash: "abc123",
      uploadedBy: null,
    });

    expect(result.uploadedBy).toBeNull();
  });

  it("delete() removes the record by documentId", async () => {
    prisma.mediaAsset.delete.mockResolvedValue(record);

    await repository.delete("media-1");

    expect(prisma.mediaAsset.delete).toHaveBeenCalledWith({ where: { documentId: "media-1" } });
  });

  it("delete() translates a P2025 not-found error into MediaAssetNotFoundError", async () => {
    prisma.mediaAsset.delete.mockRejectedValue(knownRequestError("P2025"));

    await expect(repository.delete("missing")).rejects.toThrow(MediaAssetNotFoundError);
  });

  it("delete() rethrows unrelated errors", async () => {
    prisma.mediaAsset.delete.mockRejectedValue(new Error("db down"));

    await expect(repository.delete("media-1")).rejects.toThrow("db down");
  });
});
