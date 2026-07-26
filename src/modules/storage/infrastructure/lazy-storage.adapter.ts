import { StorageAdapter, UploadFile, UploadResult } from "../domain/repositories/storage-adapter.repository";

import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

import { CloudinaryStorageAdapter } from "./cloudinary-storage.adapter";
import { S3StorageAdapter } from "./s3-storage.adapter";

@Injectable()
export class LazyStorageAdapter implements StorageAdapter {
  private resolved: StorageAdapter | null = null;

  constructor(private readonly configService: ConfigService) {}

  async upload(file: UploadFile): Promise<UploadResult> {
    return this.resolve().upload(file);
  }

  async delete(publicId: string): Promise<void> {
    return this.resolve().delete(publicId);
  }

  private resolve(): StorageAdapter {
    if (!this.resolved) {
      this.resolved = this.createAdapter();
    }

    return this.resolved;
  }

  private createAdapter(): StorageAdapter {
    const provider = this.configService.get<string>("STORAGE_PROVIDER") ?? "s3";

    if (provider === "cloudinary") {
      return new CloudinaryStorageAdapter(
        this.configService.getOrThrow<string>("CLOUDINARY_CLOUD_NAME"),
        this.configService.getOrThrow<string>("CLOUDINARY_API_KEY"),
        this.configService.getOrThrow<string>("CLOUDINARY_API_SECRET"),
      );
    }

    return new S3StorageAdapter(this.configService.getOrThrow<string>("AWS_REGION"), this.configService.getOrThrow<string>("AWS_S3_BUCKET"));
  }
}
