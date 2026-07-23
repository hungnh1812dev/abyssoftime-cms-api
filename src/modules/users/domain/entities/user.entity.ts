export class UserEntity {
  constructor(
    public readonly documentId: string,
    public readonly email: string,
    public readonly name: string,
    public readonly username: string,
    public readonly password: string,
    public readonly accountType: boolean,
    public readonly verified: boolean,
    public readonly roleId: string | null,
    public readonly createdAt: Date,
    public readonly updatedAt: Date,
  ) {}
}
