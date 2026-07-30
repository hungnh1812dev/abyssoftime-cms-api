import { IsNotEmpty, IsString } from "class-validator";

import { ApiProperty } from "@nestjs/swagger";

export class UpdateUserRoleDto {
  @ApiProperty({ description: "Triggers the level-hierarchy / super-admin-promotion check when it differs from the user's current role." })
  @IsString()
  @IsNotEmpty()
  roleId!: string;
}
