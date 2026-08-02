import { v2 as cloudinary } from "cloudinary";

import { CloudinaryStorageAdapter } from "./cloudinary-storage.adapter";

jest.mock("cloudinary", () => ({
  v2: {
    config: jest.fn(),
    uploader: {
      upload: jest.fn(),
      destroy: jest.fn(),
    },
  },
}));

describe("CloudinaryStorageAdapter", () => {
  const config = cloudinary.config as jest.Mock;
  const upload = cloudinary.uploader.upload as jest.Mock;
  const destroy = cloudinary.uploader.destroy as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("configures the Cloudinary client from constructor credentials", () => {
    new CloudinaryStorageAdapter("my-cloud", "key123", "secret456");

    expect(config).toHaveBeenCalledWith({
      cloud_name: "my-cloud",
      api_key: "key123",
      api_secret: "secret456",
    });
  });

  it("uploads a base64 data-URI with an eager thumbnail and returns url/thumbnailUrl/publicId from the response", async () => {
    upload.mockResolvedValue({
      secure_url: "https://res.cloudinary.com/my-cloud/image/upload/v1/abc.png",
      public_id: "abc",
      eager: [{ secure_url: "https://res.cloudinary.com/my-cloud/image/upload/c_thumb/v1/abc.png" }],
    });

    const adapter = new CloudinaryStorageAdapter("my-cloud", "key123", "secret456");
    const result = await adapter.upload({
      buffer: Buffer.from("data"),
      fileName: "photo.png",
      mimeType: "image/png",
    });

    expect(upload).toHaveBeenCalledTimes(1);
    const [dataUri, options] = upload.mock.calls[0] as [string, { eager: unknown; public_id: string }];
    expect(dataUri).toBe(`data:image/png;base64,${Buffer.from("data").toString("base64")}`);
    expect(options.eager).toBeDefined();
    expect(options.public_id).toMatch(/^photo_[0-9a-f]{8}$/);

    expect(result).toEqual({
      url: "https://res.cloudinary.com/my-cloud/image/upload/v1/abc.png",
      thumbnailUrl: "https://res.cloudinary.com/my-cloud/image/upload/c_thumb/v1/abc.png",
      publicId: "abc",
    });
  });

  it("falls back to the main url as thumbnailUrl when the response has no eager result", async () => {
    upload.mockResolvedValue({
      secure_url: "https://res.cloudinary.com/my-cloud/image/upload/v1/abc.png",
      public_id: "abc",
      eager: [],
    });

    const adapter = new CloudinaryStorageAdapter("my-cloud", "key123", "secret456");
    const result = await adapter.upload({
      buffer: Buffer.from("data"),
      fileName: "photo.png",
      mimeType: "image/png",
    });

    expect(result.thumbnailUrl).toBe(result.url);
  });

  it("deletes via client.uploader.destroy(publicId)", async () => {
    destroy.mockResolvedValue({ result: "ok" });
    const adapter = new CloudinaryStorageAdapter("my-cloud", "key123", "secret456");

    await adapter.delete("abc");

    expect(destroy).toHaveBeenCalledWith("abc");
  });
});
