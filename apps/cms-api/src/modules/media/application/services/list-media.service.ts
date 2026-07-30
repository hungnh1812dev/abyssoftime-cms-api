import { MediaAssetEntity } from "../../domain/entities/media-asset.entity";
import { type IMediaAssetRepository, MEDIA_ASSET_REPOSITORY } from "../../domain/repositories/media-asset.repository";

import { Inject, Injectable } from "@nestjs/common";

@Injectable()
export class ListMediaService {
  constructor(@Inject(MEDIA_ASSET_REPOSITORY) private readonly mediaAssets: IMediaAssetRepository) {}

  execute(): Promise<MediaAssetEntity[]> {
    return this.mediaAssets.findAll();
  }
}
