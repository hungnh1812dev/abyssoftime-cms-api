import { MediaAssetEntity } from "../entities/media-asset.entity";

export interface CreateMediaAssetData {
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
}

export interface IMediaAssetRepository {
  create(data: CreateMediaAssetData): Promise<MediaAssetEntity>;
  findById(documentId: string): Promise<MediaAssetEntity | null>;
  findByDocumentId(documentId: string): Promise<MediaAssetEntity | null>;
  findAll(): Promise<MediaAssetEntity[]>;
  delete(documentId: string): Promise<void>;
}

export const MEDIA_ASSET_REPOSITORY = Symbol("MEDIA_ASSET_REPOSITORY");

export class MediaAssetNotFoundError extends Error {
  constructor(documentId: string) {
    super(`Media asset "${documentId}" not found`);
    this.name = "MediaAssetNotFoundError";
  }
}
