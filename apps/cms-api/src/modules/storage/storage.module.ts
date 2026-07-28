import { Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

import { STORAGE_ADAPTER } from "./domain/repositories/storage-adapter.repository";
import { LazyStorageAdapter } from "./infrastructure/lazy-storage.adapter";

@Module({
  providers: [
    {
      provide: STORAGE_ADAPTER,
      useFactory: (configService: ConfigService) => new LazyStorageAdapter(configService),
      inject: [ConfigService],
    },
  ],
  exports: [STORAGE_ADAPTER],
})
export class StorageModule {}
