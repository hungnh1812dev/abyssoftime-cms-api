export class AccessTokenEntity {
  constructor(
    public readonly documentId: string,
    public readonly name: string,
    public readonly token: string,
    public readonly permissions: string[],
    public readonly expiresAt: Date | null,
    public readonly createdAt: Date,
    public readonly updatedAt: Date,
    public readonly updatedBy: string | null,
  ) {}
}
