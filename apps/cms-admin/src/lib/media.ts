/**
 * Uses the real Cloudinary publicId rather than deriving a display-only hash —
 * a fabricated hash never matches what Cloudinary actually shows for the asset.
 */
export function displayFileName(asset: { fileName: string; publicId: string }): string {
  const dotIndex = asset.fileName.lastIndexOf(".");
  const extension = dotIndex <= 0 ? "" : asset.fileName.slice(dotIndex);
  return `${asset.publicId}${extension}`;
}
