export class MediaAssetEntity {
  constructor(
    public readonly documentId: string,
    public readonly fileName: string,
    public readonly mimeType: string,
    public readonly size: number,
    public readonly width: number,
    public readonly height: number,
    public readonly url: string,
    public readonly thumbnailUrl: string,
    public readonly publicId: string,
    public readonly hash: string,
    public readonly uploadedBy: string | null,
    public readonly createdAt: Date,
    public readonly updatedAt: Date,
  ) {}
}
