export interface ImageDimensions {
  width: number;
  height: number;
}

export class UnsupportedImageFormatError extends Error {
  constructor() {
    super("Unsupported image format: only PNG and JPEG are supported");
    this.name = "UnsupportedImageFormatError";
  }
}

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const JPEG_SOF_MARKERS = new Set([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf]);
const JPEG_MARKERS_WITHOUT_PAYLOAD = new Set([0xd8, 0x01]);

export function getImageDimensions(buffer: Buffer): ImageDimensions {
  if (isPng(buffer)) {
    return readPngDimensions(buffer);
  }
  if (isJpeg(buffer)) {
    return readJpegDimensions(buffer);
  }
  throw new UnsupportedImageFormatError();
}

function isPng(buffer: Buffer): boolean {
  return buffer.length >= 24 && buffer.subarray(0, 8).equals(PNG_SIGNATURE);
}

function readPngDimensions(buffer: Buffer): ImageDimensions {
  const width = buffer.readUInt32BE(16);
  const height = buffer.readUInt32BE(20);
  return { width, height };
}

function isJpeg(buffer: Buffer): boolean {
  return buffer.length >= 4 && buffer[0] === 0xff && buffer[1] === 0xd8;
}

function readJpegDimensions(buffer: Buffer): ImageDimensions {
  let offset = 2;

  while (offset + 1 < buffer.length) {
    if (buffer[offset] !== 0xff) {
      throw new UnsupportedImageFormatError();
    }
    const marker = buffer[offset + 1];

    if (JPEG_MARKERS_WITHOUT_PAYLOAD.has(marker) || (marker >= 0xd0 && marker <= 0xd7)) {
      offset += 2;
      continue;
    }

    if (offset + 3 >= buffer.length) {
      break;
    }
    const segmentLength = buffer.readUInt16BE(offset + 2);

    if (JPEG_SOF_MARKERS.has(marker)) {
      const height = buffer.readUInt16BE(offset + 5);
      const width = buffer.readUInt16BE(offset + 7);
      return { width, height };
    }

    offset += 2 + segmentLength;
  }

  throw new UnsupportedImageFormatError();
}
