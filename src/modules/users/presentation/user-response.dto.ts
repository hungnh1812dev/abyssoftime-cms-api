import { UserEntity } from "../domain/entities/user.entity";

export class UserResponseDto {
  documentId!: string;
  email!: string;
  name!: string;
  username!: string;
  accountType!: boolean;
  verified!: boolean;
  roleId!: string | null;
  createdAt!: Date;
  updatedAt!: Date;

  static fromEntity(user: UserEntity): UserResponseDto {
    const dto = new UserResponseDto();
    dto.documentId = user.documentId;
    dto.email = user.email;
    dto.name = user.name;
    dto.username = user.username;
    dto.accountType = user.accountType;
    dto.verified = user.verified;
    dto.roleId = user.roleId;
    dto.createdAt = user.createdAt;
    dto.updatedAt = user.updatedAt;
    return dto;
  }
}
