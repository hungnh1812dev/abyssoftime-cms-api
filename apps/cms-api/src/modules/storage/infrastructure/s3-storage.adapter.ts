import { StorageAdapter, UploadFile, UploadResult } from "../domain/repositories/storage-adapter.repository";
import { DeleteObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { randomBytes } from "node:crypto";
import { extname } from "node:path";

export function sanitizeFileNameStem(stem: string): string {
  const sanitized = stem
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return sanitized || "file";
}

export class S3StorageAdapter implements StorageAdapter {
  private readonly client: S3Client;

  constructor(
    private readonly region: string,
    private readonly bucket: string,
  ) {
    this.client = new S3Client({ region: this.region });
  }

  async upload(file: UploadFile): Promise<UploadResult> {
    const ext = extname(file.fileName);
    const stem = sanitizeFileNameStem(file.fileName.slice(0, file.fileName.length - ext.length));
    const key = `${randomBytes(8).toString("hex")}-${stem}${ext}`;

    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: file.buffer,
        ContentType: file.mimeType,
      }),
    );

    const url = `https://${this.bucket}.s3.${this.region}.amazonaws.com/${key}`;

    return { url, thumbnailUrl: url, publicId: key };
  }

  async delete(publicId: string): Promise<void> {
    await this.client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: publicId }));
  }
}
