import { type StorageAdapter, type UploadFile, type UploadResult } from "@/modules/storage/domain/repositories/storage-adapter.repository";

export class NoopStorageAdapter implements StorageAdapter {
  readonly uploads: UploadFile[] = [];
  readonly deletes: string[] = [];
  private failNextDeleteOnce = false;

  upload(file: UploadFile): Promise<UploadResult> {
    this.uploads.push(file);
    return Promise.resolve({
      url: `noop://media/${file.fileName}`,
      thumbnailUrl: `noop://media/${file.fileName}`,
      publicId: file.fileName,
    });
  }

  delete(publicId: string): Promise<void> {
    if (this.failNextDeleteOnce) {
      this.failNextDeleteOnce = false;
      return Promise.reject(new Error(`NoopStorageAdapter: forced delete failure for "${publicId}"`));
    }
    this.deletes.push(publicId);
    return Promise.resolve();
  }

  failNextDelete(): void {
    this.failNextDeleteOnce = true;
  }
}
