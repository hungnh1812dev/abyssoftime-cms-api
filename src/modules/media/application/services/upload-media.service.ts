import { MediaAssetEntity } from "../../domain/entities/media-asset.entity";
import { type IMediaAssetRepository, MEDIA_ASSET_REPOSITORY } from "../../domain/repositories/media-asset.repository";
import { getImageDimensions, UnsupportedImageFormatError } from "../util/image-dimensions.util";

import { createHash } from "node:crypto";

import { Inject, Injectable, PayloadTooLargeException, UnprocessableEntityException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

import { type EnvironmentVariables } from "@/config/env.validation";
import { STORAGE_ADAPTER, type StorageAdapter } from "@/modules/storage/domain/repositories/storage-adapter.repository";

export interface UploadMediaInput {
  buffer: Buffer;
  fileName: string;
  mimeType: string;
  uploadedBy: string | null;
}

@Injectable()
export class UploadMediaService {
  constructor(
    @Inject(MEDIA_ASSET_REPOSITORY) private readonly mediaAssets: IMediaAssetRepository,
    @Inject(STORAGE_ADAPTER) private readonly storage: StorageAdapter,
    private readonly configService: ConfigService<EnvironmentVariables, true>,
  ) {}

  async execute(input: UploadMediaInput): Promise<MediaAssetEntity> {
    const maxUploadBytes = this.configService.get("MEDIA_MAX_UPLOAD_BYTES", { infer: true });
    if (input.buffer.length > maxUploadBytes) {
      throw new PayloadTooLargeException(`File exceeds maximum upload size of ${maxUploadBytes} bytes`);
    }

    let dimensions: { width: number; height: number };
    try {
      dimensions = getImageDimensions(input.buffer);
    } catch (error) {
      if (error instanceof UnsupportedImageFormatError) {
        throw new UnprocessableEntityException(error.message);
      }
      throw error;
    }

    const uploadResult = await this.storage.upload({ buffer: input.buffer, fileName: input.fileName, mimeType: input.mimeType });

    const hash = createHash("sha256").update(input.buffer).digest("hex");

    return this.mediaAssets.create({
      fileName: input.fileName,
      mimeType: input.mimeType,
      size: input.buffer.length,
      width: dimensions.width,
      height: dimensions.height,
      url: uploadResult.url,
      thumbnailUrl: uploadResult.thumbnailUrl,
      publicId: uploadResult.publicId,
      hash,
      uploadedBy: input.uploadedBy,
    });
  }
}
