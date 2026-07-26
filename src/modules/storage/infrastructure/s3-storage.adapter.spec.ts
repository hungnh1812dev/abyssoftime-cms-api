import { DeleteObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

import { S3StorageAdapter, sanitizeFileNameStem } from "./s3-storage.adapter";

jest.mock("@aws-sdk/client-s3", () => {
  const actual = jest.requireActual<typeof import("@aws-sdk/client-s3")>("@aws-sdk/client-s3");
  return { ...actual, S3Client: jest.fn() };
});

describe("sanitizeFileNameStem", () => {
  it("lowercases and replaces unsafe characters with hyphens", () => {
    expect(sanitizeFileNameStem("My Cool Photo!!.png")).toBe("my-cool-photo-png");
  });

  it("trims leading and trailing hyphens", () => {
    expect(sanitizeFileNameStem("--Weird--")).toBe("weird");
  });

  it("falls back to a default stem when nothing safe remains", () => {
    expect(sanitizeFileNameStem("???")).toBe("file");
  });
});

describe("S3StorageAdapter", () => {
  const send = jest.fn<Promise<object>, [PutObjectCommand | DeleteObjectCommand]>();

  beforeEach(() => {
    jest.clearAllMocks();
    (S3Client as jest.Mock).mockImplementation(() => ({ send }));
  });

  it("uploads via PutObjectCommand and returns a virtual-hosted URL with a matching thumbnailUrl", async () => {
    send.mockResolvedValue({});
    const adapter = new S3StorageAdapter("us-east-1", "my-bucket");

    const result = await adapter.upload({
      buffer: Buffer.from("data"),
      fileName: "Vacation Photo.png",
      mimeType: "image/png",
    });

    expect(S3Client).toHaveBeenCalledWith({ region: "us-east-1" });
    expect(send).toHaveBeenCalledTimes(1);
    const command = send.mock.calls[0][0];
    expect(command).toBeInstanceOf(PutObjectCommand);
    expect(command.input).toMatchObject({
      Bucket: "my-bucket",
      Body: Buffer.from("data"),
      ContentType: "image/png",
    });
    expect(command.input.Key).toMatch(/^[0-9a-f]{16}-vacation-photo\.png$/);

    expect(result.url).toBe(`https://my-bucket.s3.us-east-1.amazonaws.com/${command.input.Key}`);
    expect(result.thumbnailUrl).toBe(result.url);
    expect(result.publicId).toBe(command.input.Key);
  });

  it("deletes via DeleteObjectCommand using the publicId as the key", async () => {
    send.mockResolvedValue({});
    const adapter = new S3StorageAdapter("us-east-1", "my-bucket");

    await adapter.delete("abc123-vacation-photo.png");

    expect(send).toHaveBeenCalledTimes(1);
    const command = send.mock.calls[0][0];
    expect(command).toBeInstanceOf(DeleteObjectCommand);
    expect(command.input).toMatchObject({ Bucket: "my-bucket", Key: "abc123-vacation-photo.png" });
  });
});
