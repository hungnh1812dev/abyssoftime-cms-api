import { MODULE_METADATA } from "@nestjs/common/constants";

import { StorageModule } from "@/modules/storage/storage.module";

import { DeleteMediaService } from "./application/services/delete-media.service";
import { ListMediaService } from "./application/services/list-media.service";
import { UploadMediaService } from "./application/services/upload-media.service";
import { MEDIA_ASSET_REPOSITORY } from "./domain/repositories/media-asset.repository";
import { PrismaMediaRepository } from "./infrastructure/persistence/prisma-media.repository";
import { MediaModule } from "./media.module";
import { MediaController } from "./presentation/media.controller";

describe("MediaModule", () => {
  it("imports only StorageModule", () => {
    expect(Reflect.getMetadata(MODULE_METADATA.IMPORTS, MediaModule)).toEqual([StorageModule]);
  });

  it("registers the MediaController", () => {
    expect(Reflect.getMetadata(MODULE_METADATA.CONTROLLERS, MediaModule)).toEqual([MediaController]);
  });

  it("registers the application services and binds the repository token to its Prisma implementation", () => {
    const providers = Reflect.getMetadata(MODULE_METADATA.PROVIDERS, MediaModule) as unknown[];

    expect(providers).toEqual([UploadMediaService, ListMediaService, DeleteMediaService, { provide: MEDIA_ASSET_REPOSITORY, useClass: PrismaMediaRepository }]);
  });
});
