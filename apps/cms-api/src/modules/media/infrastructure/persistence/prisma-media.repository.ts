import { MediaAssetEntity } from "../../domain/entities/media-asset.entity";
import { CreateMediaAssetData, IMediaAssetRepository, MediaAssetNotFoundError } from "../../domain/repositories/media-asset.repository";

import { Injectable } from "@nestjs/common";

import { Prisma } from "@/prisma/application/client";
import { PrismaService } from "@/prisma/application/prisma.service";

@Injectable()
export class PrismaMediaRepository implements IMediaAssetRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(): Promise<MediaAssetEntity[]> {
    const assets = await this.prisma.mediaAsset.findMany({ orderBy: { createdAt: "desc" } });
    return assets.map((asset) => this.toEntity(asset));
  }

  async findById(documentId: string): Promise<MediaAssetEntity | null> {
    const asset = await this.prisma.mediaAsset.findUnique({ where: { documentId } });
    return asset ? this.toEntity(asset) : null;
  }

  async findByDocumentIds(documentIds: string[]): Promise<MediaAssetEntity[]> {
    const assets = await this.prisma.mediaAsset.findMany({ where: { documentId: { in: documentIds } } });
    return assets.map((asset) => this.toEntity(asset));
  }

  async create(data: CreateMediaAssetData): Promise<MediaAssetEntity> {
    const asset = await this.prisma.mediaAsset.create({
      data: {
        fileName: data.fileName,
        mimeType: data.mimeType,
        size: data.size,
        width: data.width,
        height: data.height,
        url: data.url,
        thumbnailUrl: data.thumbnailUrl,
        publicId: data.publicId,
        hash: data.hash,
        uploadedBy: data.uploadedBy,
      },
    });
    return this.toEntity(asset);
  }

  async delete(documentId: string): Promise<void> {
    try {
      await this.prisma.mediaAsset.delete({ where: { documentId } });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
        throw new MediaAssetNotFoundError(documentId);
      }
      throw error;
    }
  }

  private toEntity(asset: {
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
  }): MediaAssetEntity {
    return new MediaAssetEntity(
      asset.documentId,
      asset.fileName,
      asset.mimeType,
      asset.size,
      asset.width,
      asset.height,
      asset.url,
      asset.thumbnailUrl,
      asset.publicId,
      asset.hash,
      asset.uploadedBy,
      asset.createdAt,
      asset.updatedAt,
    );
  }
}
