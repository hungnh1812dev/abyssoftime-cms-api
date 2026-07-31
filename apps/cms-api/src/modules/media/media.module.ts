import { Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { MulterModule } from "@nestjs/platform-express";

import { type EnvironmentVariables } from "@/config/env.validation";
import { StorageModule } from "@/modules/storage/storage.module";

import { DeleteMediaService } from "./application/services/delete-media.service";
import { ListMediaService } from "./application/services/list-media.service";
import { UploadMediaService } from "./application/services/upload-media.service";
import { MEDIA_ASSET_REPOSITORY } from "./domain/repositories/media-asset.repository";
import { PrismaMediaRepository } from "./infrastructure/persistence/prisma-media.repository";
import { MediaController } from "./presentation/media.controller";

@Module({
  imports: [
    StorageModule,
    MulterModule.registerAsync({
      useFactory: (configService: ConfigService<EnvironmentVariables, true>) => ({
        limits: { fileSize: configService.get("MEDIA_MAX_UPLOAD_BYTES", { infer: true }) },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [MediaController],
  providers: [UploadMediaService, ListMediaService, DeleteMediaService, { provide: MEDIA_ASSET_REPOSITORY, useClass: PrismaMediaRepository }],
  exports: [MEDIA_ASSET_REPOSITORY],
})
export class MediaModule {}
