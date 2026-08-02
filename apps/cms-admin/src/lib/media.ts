const HASH_PREFIX_LENGTH = 8;

export function displayFileName(asset: { fileName: string; hash: string }): string {
  const shortHash = asset.hash.slice(0, HASH_PREFIX_LENGTH);
  const dotIndex = asset.fileName.lastIndexOf(".");

  if (dotIndex <= 0) return `${asset.fileName}_${shortHash}`;
  return `${asset.fileName.slice(0, dotIndex)}_${shortHash}${asset.fileName.slice(dotIndex)}`;
}
