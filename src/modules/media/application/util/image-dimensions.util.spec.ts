import { getImageDimensions, UnsupportedImageFormatError } from "./image-dimensions.util";

function buildPngBuffer(width: number, height: number): Buffer {
  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const length = Buffer.alloc(4);
  length.writeUInt32BE(13, 0);
  const chunkType = Buffer.from("IHDR", "ascii");
  const widthBuf = Buffer.alloc(4);
  widthBuf.writeUInt32BE(width, 0);
  const heightBuf = Buffer.alloc(4);
  heightBuf.writeUInt32BE(height, 0);
  const rest = Buffer.from([0x08, 0x02, 0x00, 0x00, 0x00]);
  return Buffer.concat([signature, length, chunkType, widthBuf, heightBuf, rest]);
}

function buildJpegBuffer(width: number, height: number, sofMarker = 0xc0): Buffer {
  const soi = Buffer.from([0xff, 0xd8]);

  const app0Payload = Buffer.from("JFIF\0\x01\x01\x00\x00\x01\x00\x01\x00\x00", "binary");
  const app0Length = Buffer.alloc(2);
  app0Length.writeUInt16BE(app0Payload.length + 2, 0);
  const app0 = Buffer.concat([Buffer.from([0xff, 0xe0]), app0Length, app0Payload]);

  const numComponents = 3;
  const sofLength = Buffer.alloc(2);
  sofLength.writeUInt16BE(2 + 1 + 2 + 2 + 1 + numComponents * 3, 0);
  const precision = Buffer.from([0x08]);
  const heightBuf = Buffer.alloc(2);
  heightBuf.writeUInt16BE(height, 0);
  const widthBuf = Buffer.alloc(2);
  widthBuf.writeUInt16BE(width, 0);
  const componentCount = Buffer.from([numComponents]);
  const componentData = Buffer.alloc(numComponents * 3);
  const sof = Buffer.concat([Buffer.from([0xff, sofMarker]), sofLength, precision, heightBuf, widthBuf, componentCount, componentData]);

  return Buffer.concat([soi, app0, sof]);
}

describe("getImageDimensions", () => {
  it("reads width/height from a PNG IHDR chunk", () => {
    const buffer = buildPngBuffer(800, 600);

    expect(getImageDimensions(buffer)).toEqual({ width: 800, height: 600 });
  });

  it("reads width/height from a baseline JPEG SOF0 segment, skipping APP0", () => {
    const buffer = buildJpegBuffer(1024, 768, 0xc0);

    expect(getImageDimensions(buffer)).toEqual({ width: 1024, height: 768 });
  });

  it("reads width/height from a progressive JPEG SOF2 segment", () => {
    const buffer = buildJpegBuffer(400, 300, 0xc2);

    expect(getImageDimensions(buffer)).toEqual({ width: 400, height: 300 });
  });

  it("throws UnsupportedImageFormatError for a non-image buffer", () => {
    const buffer = Buffer.from("not an image, just plain text bytes");

    expect(() => getImageDimensions(buffer)).toThrow(UnsupportedImageFormatError);
  });

  it("throws UnsupportedImageFormatError for an empty buffer", () => {
    expect(() => getImageDimensions(Buffer.alloc(0))).toThrow(UnsupportedImageFormatError);
  });
});
