import { IsBoolean, IsEmail, IsNotEmpty, IsString, Matches, MinLength } from "class-validator";

import { ApiProperty } from "@nestjs/swagger";

const USERNAME_PATTERN = /^[a-zA-Z0-9_.-]{3,32}$/;
const PASSWORD_MIN_LENGTH = 8;

export class RegisterDto {
  @ApiProperty({ example: "user@example.com" })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: "Jane Doe" })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiProperty({ example: "janedoe", description: "3-32 chars: letters, numbers, underscores, dots, or hyphens." })
  @Matches(USERNAME_PATTERN, { message: "username must be 3-32 characters and contain only letters, numbers, underscores, dots, or hyphens" })
  username!: string;

  @ApiProperty({ example: "SecurePass123!", minLength: PASSWORD_MIN_LENGTH })
  @IsString()
  @MinLength(PASSWORD_MIN_LENGTH)
  password!: string;

  @ApiProperty({ example: false })
  @IsBoolean()
  accountType!: boolean;
}
