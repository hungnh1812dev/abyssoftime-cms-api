import { ApiProperty } from "@nestjs/swagger";

import { RoleEntity } from "@/modules/roles/domain/entities/role.entiry";
import { RoleResponseDto } from "@/modules/roles/presentation/dto/role-response.dto";
import { UserEntity } from "@/modules/users/domain/entities/user.entity";

export class MeResponseDto {
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

  @ApiProperty({ type: RoleResponseDto, nullable: true })
  role!: RoleResponseDto | null;

  static fromEntities(user: UserEntity, role: RoleEntity | null): MeResponseDto {
    const dto = new MeResponseDto();
    dto.documentId = user.documentId;
    dto.email = user.email;
    dto.name = user.name;
    dto.username = user.username;
    dto.accountType = user.accountType;
    dto.verified = user.verified;
    dto.roleId = user.roleId;
    dto.createdAt = user.createdAt;
    dto.updatedAt = user.updatedAt;
    dto.role = role;
    return dto;
  }
}
