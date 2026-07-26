import { Module } from "@nestjs/common";

import { StorageModule } from "@/modules/storage/storage.module";

import { DeleteMediaService } from "./application/services/delete-media.service";
import { ListMediaService } from "./application/services/list-media.service";
import { UploadMediaService } from "./application/services/upload-media.service";
import { MEDIA_ASSET_REPOSITORY } from "./domain/repositories/media-asset.repository";
import { PrismaMediaRepository } from "./infrastructure/persistence/prisma-media.repository";
import { MediaController } from "./presentation/media.controller";

@Module({
  imports: [StorageModule],
  controllers: [MediaController],
  providers: [UploadMediaService, ListMediaService, DeleteMediaService, { provide: MEDIA_ASSET_REPOSITORY, useClass: PrismaMediaRepository }],
})
export class MediaModule {}
