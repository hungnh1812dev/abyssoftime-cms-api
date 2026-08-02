import { StorageAdapter, UploadFile, UploadResult } from "../domain/repositories/storage-adapter.repository";
import { v2 as cloudinary } from "cloudinary";
import { randomBytes } from "crypto";

export class CloudinaryStorageAdapter implements StorageAdapter {
  constructor(cloudName: string, apiKey: string, apiSecret: string) {
    cloudinary.config({ cloud_name: cloudName, api_key: apiKey, api_secret: apiSecret });
  }

  async upload(file: UploadFile): Promise<UploadResult> {
    const dataUri = `data:${file.mimeType};base64,${file.buffer.toString("base64")}`;
    const baseName = file.fileName
      .replace(/\.[^/.]+$/, "")
      .replace(/[^a-zA-Z0-9_-]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 100);
    const hash = randomBytes(4).toString("hex");

    const response = await cloudinary.uploader.upload(dataUri, {
      eager: [{ width: 200, height: 200, crop: "thumb" }],
      public_id: `${baseName}_${hash}`,
    });

    const thumbnailUrl = (response.eager as { secure_url: string }[] | undefined)?.[0]?.secure_url ?? response.secure_url;

    return {
      url: response.secure_url,
      thumbnailUrl,
      publicId: response.public_id,
    };
  }

  async delete(publicId: string): Promise<void> {
    await cloudinary.uploader.destroy(publicId);
  }
}
