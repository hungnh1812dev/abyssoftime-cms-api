import { type IMediaAssetRepository, MEDIA_ASSET_REPOSITORY, MediaAssetNotFoundError } from "../../domain/repositories/media-asset.repository";

import { Inject, Injectable, NotFoundException } from "@nestjs/common";

import { STORAGE_ADAPTER, type StorageAdapter } from "@/modules/storage/domain/repositories/storage-adapter.repository";

@Injectable()
export class DeleteMediaService {
  constructor(
    @Inject(MEDIA_ASSET_REPOSITORY) private readonly mediaAssets: IMediaAssetRepository,
    @Inject(STORAGE_ADAPTER) private readonly storage: StorageAdapter,
  ) {}

  async execute(documentId: string): Promise<void> {
    const asset = await this.mediaAssets.findById(documentId);
    if (!asset) {
      throw new NotFoundException(`Media asset "${documentId}" not found`);
    }

    await this.storage.delete(asset.publicId);

    try {
      await this.mediaAssets.delete(documentId);
    } catch (error) {
      if (error instanceof MediaAssetNotFoundError) {
        throw new NotFoundException(error.message);
      }
      throw error;
    }
  }
}
