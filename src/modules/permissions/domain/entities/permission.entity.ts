export class PermissionEntity {
  constructor(
    public readonly documentId: string,
    public readonly slug: string,
    public readonly name: string,
    public readonly description: string | undefined,
    public readonly createdAt: Date,
    public readonly updatedAt: Date,
    public readonly updatedBy: string,
  ) {}
}
