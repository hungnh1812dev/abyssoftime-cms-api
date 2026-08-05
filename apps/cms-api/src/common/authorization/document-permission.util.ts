export function isDocumentActionGranted(granted: string[], requiredSlug: string, contentTypeSlug: string): boolean {
  return granted.includes(requiredSlug) || granted.includes(`${requiredSlug}:${contentTypeSlug}`);
}
