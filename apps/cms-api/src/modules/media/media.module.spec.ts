import { type DynamicModule } from "@nestjs/common";
import { MODULE_METADATA } from "@nestjs/common/constants";
import { ConfigService } from "@nestjs/config";
import { MulterModule } from "@nestjs/platform-express";

import { type EnvironmentVariables } from "@/config/env.validation";
import { StorageModule } from "@/modules/storage/storage.module";

import { DeleteMediaService } from "./application/services/delete-media.service";
import { ListMediaService } from "./application/services/list-media.service";
import { UploadMediaService } from "./application/services/upload-media.service";
import { MEDIA_ASSET_REPOSITORY } from "./domain/repositories/media-asset.repository";
import { PrismaMediaRepository } from "./infrastructure/persistence/prisma-media.repository";
import { MediaModule } from "./media.module";
import { MediaController } from "./presentation/media.controller";

interface AsyncOptionsProvider {
  provide: string;
  useFactory: (configService: ConfigService<EnvironmentVariables, true>) => { limits: { fileSize: number } };
  inject: unknown[];
}

describe("MediaModule", () => {
  it("imports StorageModule and a MulterModule registered with MEDIA_MAX_UPLOAD_BYTES as the fileSize limit", () => {
    const imports = Reflect.getMetadata(MODULE_METADATA.IMPORTS, MediaModule) as [typeof StorageModule, DynamicModule];

    expect(imports).toHaveLength(2);
    expect(imports[0]).toBe(StorageModule);

    const multerDynamicModule = imports[1];
    expect(multerDynamicModule.module).toBe(MulterModule);

    const optionsProvider = (multerDynamicModule.providers as AsyncOptionsProvider[]).find((provider) => provider.provide === "MULTER_MODULE_OPTIONS");
    expect(optionsProvider).toBeDefined();
    expect(optionsProvider?.inject).toEqual([ConfigService]);

    const configService = { get: jest.fn().mockReturnValue(5_000_000) } as unknown as ConfigService<EnvironmentVariables, true>;
    expect(optionsProvider?.useFactory(configService)).toEqual({ limits: { fileSize: 5_000_000 } });
    expect(configService.get).toHaveBeenCalledWith("MEDIA_MAX_UPLOAD_BYTES", { infer: true });
  });

  it("registers the MediaController", () => {
    expect(Reflect.getMetadata(MODULE_METADATA.CONTROLLERS, MediaModule)).toEqual([MediaController]);
  });

  it("registers the application services and binds the repository token to its Prisma implementation", () => {
    const providers = Reflect.getMetadata(MODULE_METADATA.PROVIDERS, MediaModule) as unknown[];

    expect(providers).toEqual([UploadMediaService, ListMediaService, DeleteMediaService, { provide: MEDIA_ASSET_REPOSITORY, useClass: PrismaMediaRepository }]);
  });
});
