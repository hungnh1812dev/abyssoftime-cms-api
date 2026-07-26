import { MODULE_METADATA } from "@nestjs/common/constants";
import { ConfigService } from "@nestjs/config";

import { STORAGE_ADAPTER } from "./domain/repositories/storage-adapter.repository";
import { LazyStorageAdapter } from "./infrastructure/lazy-storage.adapter";
import { StorageModule } from "./storage.module";

interface FactoryProvider {
  provide: symbol;
  useFactory: (configService: ConfigService) => unknown;
  inject: unknown[];
}

describe("StorageModule", () => {
  it("registers a single STORAGE_ADAPTER factory provider injected with ConfigService", () => {
    const providers = Reflect.getMetadata(MODULE_METADATA.PROVIDERS, StorageModule) as FactoryProvider[];

    expect(providers).toHaveLength(1);
    expect(providers[0].provide).toBe(STORAGE_ADAPTER);
    expect(providers[0].inject).toEqual([ConfigService]);
  });

  it("builds a LazyStorageAdapter from the injected ConfigService", () => {
    const providers = Reflect.getMetadata(MODULE_METADATA.PROVIDERS, StorageModule) as FactoryProvider[];
    const configService = {} as ConfigService;

    expect(providers[0].useFactory(configService)).toBeInstanceOf(LazyStorageAdapter);
  });

  it("exports STORAGE_ADAPTER", () => {
    expect(Reflect.getMetadata(MODULE_METADATA.EXPORTS, StorageModule)).toEqual([STORAGE_ADAPTER]);
  });
});
