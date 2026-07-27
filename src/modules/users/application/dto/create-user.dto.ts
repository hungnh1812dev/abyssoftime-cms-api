import { IsBoolean, IsEmail, IsNotEmpty, IsOptional, IsString } from "class-validator";

import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class CreateUserDto {
  @ApiProperty({ example: "user@example.com" })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: "Jane Doe" })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiProperty({ example: "janedoe" })
  @IsString()
  @IsNotEmpty()
  username!: string;

  @ApiProperty({ example: "changeme123", description: "Stored as plaintext by this route (no hashing) — see users.md's known gaps." })
  @IsString()
  @IsNotEmpty()
  password!: string;

  @ApiProperty({ example: false })
  @IsBoolean()
  accountType!: boolean;

  @ApiPropertyOptional({ example: false, description: "Defaults to false when omitted." })
  @IsOptional()
  @IsBoolean()
  verified?: boolean;

  @ApiProperty({ description: "Not validated for existence against the roles catalog." })
  @IsString()
  @IsNotEmpty()
  roleId!: string;
}
