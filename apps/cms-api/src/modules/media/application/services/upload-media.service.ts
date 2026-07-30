import { MediaAssetEntity } from "../../domain/entities/media-asset.entity";
import { type IMediaAssetRepository, MEDIA_ASSET_REPOSITORY } from "../../domain/repositories/media-asset.repository";
import { getCanonicalMimeType, getImageDimensions, UnsupportedImageFormatError, withCanonicalExtension } from "../util/image-dimensions.util";
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

    let dimensions: ReturnType<typeof getImageDimensions>;
    try {
      dimensions = getImageDimensions(input.buffer);
    } catch (error) {
      if (error instanceof UnsupportedImageFormatError) {
        throw new UnprocessableEntityException(error.message);
      }
      throw error;
    }

    // Derived from the sniffed magic bytes, not the caller-supplied mimeType/fileName — a
    // spoofed mimeType (e.g. an image/html polyglot) must never reach storage's Content-Type.
    const canonicalMimeType = getCanonicalMimeType(dimensions.format);
    const storageFileName = withCanonicalExtension(input.fileName, dimensions.format);

    const uploadResult = await this.storage.upload({ buffer: input.buffer, fileName: storageFileName, mimeType: canonicalMimeType });

    const hash = createHash("sha256").update(input.buffer).digest("hex");

    return this.mediaAssets.create({
      fileName: input.fileName,
      mimeType: canonicalMimeType,
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
