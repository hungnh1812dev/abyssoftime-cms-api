const HASH_PREFIX_LENGTH = 8;

/**
 * Content hash alone collides for repeat uploads of the same bytes, which made
 * distinct uploads (different createdAt) look identical in the library. Folding
 * createdAt into the display hash keeps each upload visually distinct.
 */
function shortDisplayHash(hash: string, createdAt: string): string {
  let value = 0;
  const input = `${hash}:${createdAt}`;
  for (let i = 0; i < input.length; i++) {
    value = (value << 5) - value + input.charCodeAt(i);
    value |= 0;
  }
  return (value >>> 0).toString(16).padStart(HASH_PREFIX_LENGTH, "0").slice(0, HASH_PREFIX_LENGTH);
}

export function displayFileName(asset: { fileName: string; hash: string; createdAt: string }): string {
  const shortHash = shortDisplayHash(asset.hash, asset.createdAt);
  const dotIndex = asset.fileName.lastIndexOf(".");

  if (dotIndex <= 0) return `${asset.fileName}_${shortHash}`;
  return `${asset.fileName.slice(0, dotIndex)}_${shortHash}${asset.fileName.slice(dotIndex)}`;
}
