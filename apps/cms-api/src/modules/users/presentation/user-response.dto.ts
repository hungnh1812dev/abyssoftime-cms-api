import { UserEntity } from "../domain/entities/user.entity";

import { ApiProperty } from "@nestjs/swagger";

export class UserResponseDto {
  @ApiProperty()
  documentId!: string;

  @ApiProperty({ example: "user@example.com" })
  email!: string;

  @ApiProperty({ example: "Jane Doe" })
  name!: string;

  @ApiProperty({ example: "janedoe" })
  username!: string;

  @ApiProperty({ example: false })
  accountType!: boolean;

  @ApiProperty()
  verified!: boolean;

  @ApiProperty({ nullable: true })
  roleId!: string | null;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
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
