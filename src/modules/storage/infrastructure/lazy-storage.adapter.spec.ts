import { ConfigService } from "@nestjs/config";

import { CloudinaryStorageAdapter } from "./cloudinary-storage.adapter";
import { LazyStorageAdapter } from "./lazy-storage.adapter";
import { S3StorageAdapter } from "./s3-storage.adapter";

jest.mock("./s3-storage.adapter");
jest.mock("./cloudinary-storage.adapter");

describe("LazyStorageAdapter", () => {
  const get = jest.fn();
  const getOrThrow = jest.fn();
  const configService = { get, getOrThrow } as unknown as ConfigService;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("reads no config at construction", () => {
    get.mockImplementation(() => {
      throw new Error("get should not be called at construction");
    });
    getOrThrow.mockImplementation(() => {
      throw new Error("getOrThrow should not be called at construction");
    });

    expect(() => new LazyStorageAdapter(configService)).not.toThrow();
  });

  it("resolves CloudinaryStorageAdapter by default when STORAGE_PROVIDER is unset", async () => {
    get.mockReturnValue(undefined);
    getOrThrow.mockImplementation((key: string) => {
      const values: Record<string, string> = {
        CLOUDINARY_CLOUD_NAME: "my-cloud",
        CLOUDINARY_API_KEY: "key",
        CLOUDINARY_API_SECRET: "secret",
      };
      return values[key];
    });
    (CloudinaryStorageAdapter.prototype.delete as jest.Mock).mockResolvedValue(undefined);

    const adapter = new LazyStorageAdapter(configService);
    await adapter.delete("abc");

    expect(get).toHaveBeenCalledWith("STORAGE_PROVIDER");
    expect(CloudinaryStorageAdapter).toHaveBeenCalledWith("my-cloud", "key", "secret");
    expect(S3StorageAdapter).not.toHaveBeenCalled();
    expect(CloudinaryStorageAdapter.prototype.delete).toHaveBeenCalledWith("abc");
  });

  it("resolves S3StorageAdapter when STORAGE_PROVIDER=s3", async () => {
    get.mockReturnValue("s3");
    getOrThrow.mockImplementation((key: string) => {
      const values: Record<string, string> = { AWS_REGION: "us-east-1", AWS_S3_BUCKET: "my-bucket" };
      return values[key];
    });
    const uploadResult = { url: "u", thumbnailUrl: "u", publicId: "p" };
    (S3StorageAdapter.prototype.upload as jest.Mock).mockResolvedValue(uploadResult);

    const adapter = new LazyStorageAdapter(configService);
    const file = { buffer: Buffer.from("x"), fileName: "a.png", mimeType: "image/png" };
    const result = await adapter.upload(file);

    expect(S3StorageAdapter).toHaveBeenCalledWith("us-east-1", "my-bucket");
    expect(CloudinaryStorageAdapter).not.toHaveBeenCalled();
    expect(S3StorageAdapter.prototype.upload).toHaveBeenCalledWith(file);
    expect(result).toBe(uploadResult);
  });

  it("resolves the concrete adapter only once and reuses it across calls", async () => {
    get.mockReturnValue("s3");
    getOrThrow.mockImplementation((key: string) => {
      const values: Record<string, string> = { AWS_REGION: "us-east-1", AWS_S3_BUCKET: "my-bucket" };
      return values[key];
    });
    (S3StorageAdapter.prototype.upload as jest.Mock).mockResolvedValue({
      url: "u",
      thumbnailUrl: "u",
      publicId: "p",
    });
    (S3StorageAdapter.prototype.delete as jest.Mock).mockResolvedValue(undefined);

    const adapter = new LazyStorageAdapter(configService);
    const file = { buffer: Buffer.from("x"), fileName: "a.png", mimeType: "image/png" };
    await adapter.upload(file);
    await adapter.delete("abc");

    expect(S3StorageAdapter).toHaveBeenCalledTimes(1);
  });
});
