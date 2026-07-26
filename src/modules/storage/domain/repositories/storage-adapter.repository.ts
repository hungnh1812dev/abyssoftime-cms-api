export interface UploadFile {
  buffer: Buffer;
  fileName: string;
  mimeType: string;
}

export interface UploadResult {
  url: string;
  thumbnailUrl: string;
  publicId: string;
}

export interface StorageAdapter {
  upload(file: UploadFile): Promise<UploadResult>;
  delete(publicId: string): Promise<void>;
}

export const STORAGE_ADAPTER = Symbol("STORAGE_ADAPTER");
