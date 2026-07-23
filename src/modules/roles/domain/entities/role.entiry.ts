export class RoleEntity {
  constructor(
    public readonly documentId: string,
    public readonly name: string,
    public readonly slug: string,
    public readonly permissions: string[],
    public readonly level: number,
    public readonly isDefault: boolean,
    public readonly createdAt: Date,
    public readonly updatedAt: Date,
    public readonly updatedBy: string,
  ) {}
}
